#!/usr/bin/env node
// Stdio MCP proxy that keeps one client request in flight at a time.
//
//   node mcp-serial.mjs -- <command> [args...]      e.g. -- /usr/local/bin/node <qmd entry> --index brain mcp
//
// Why: QMD 2.8.3 swaps process.stdout.write for a stderr writer while it loads its models (dist/llm.js,
// withNativeStdoutRedirectedToStderr). Any response the server writes in that window goes to stderr and
// the client waits forever, which happens when an agent sends `get` alongside the first `query` on a cold
// server. Holding each request until the previous one is answered means nothing else is answered while a
// query is loading models. Regression check: `mcp-check.mjs --concurrent` (fails on bare QMD, passes here).
//
// Protocol: newline-delimited JSON-RPC (MCP stdio). Client requests (method + id) are queued; client
// notifications and client responses pass straight through. Server output passes straight through; the
// response to the in-flight id releases the next request. Cancelling the in-flight request releases it too
// (the server may never answer it); cancelling a queued request drops it. Server stderr is inherited.
// Exits with the server's exit code. Remove this wrapper once QMD fixes the redirect upstream.

import { spawn } from "node:child_process";

const sep = process.argv.indexOf("--");
if (sep < 0 || sep === process.argv.length - 1) {
  console.error("usage: mcp-serial.mjs -- <command> [args...]");
  process.exit(2);
}
const [cmd, ...args] = process.argv.slice(sep + 1);
const child = spawn(cmd, args, { stdio: ["pipe", "pipe", "inherit"] });
child.on("error", (e) => { console.error(`mcp-serial: cannot start ${cmd}: ${e.message}`); process.exit(1); });
child.on("exit", (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
child.stdin.on("error", () => {}); // the server exiting first is reported through "exit"

const queue = [];   // { id, line } client requests not yet sent
let inflight = null; // id of the request the server is working on (null = idle)
const key = (id) => JSON.stringify(id); // ids may be numbers or strings

function pump() {
  if (inflight !== null || !queue.length) return;
  const next = queue.shift();
  inflight = key(next.id);
  child.stdin.write(next.line + "\n");
}

function lines(stream, onLine) {
  let buf = "";
  stream.setEncoding("utf8");
  stream.on("data", (d) => {
    buf += d;
    let nl;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl);
      buf = buf.slice(nl + 1);
      if (line.trim()) onLine(line);
    }
  });
}

const parse = (line) => { try { return JSON.parse(line); } catch { return null; } };

lines(process.stdin, (line) => {
  const msg = parse(line);
  if (msg && msg.method && msg.id !== undefined && msg.id !== null) { // request: serialize
    queue.push({ id: msg.id, line });
    return pump();
  }
  if (msg && msg.method === "notifications/cancelled" && msg.params) {
    const k = key(msg.params.requestId);
    const i = queue.findIndex((r) => key(r.id) === k);
    if (i >= 0) { queue.splice(i, 1); return; } // never sent: drop it, nothing to forward
    if (k === inflight) { child.stdin.write(line + "\n"); inflight = null; return pump(); }
  }
  child.stdin.write(line + "\n"); // notifications, responses to server requests, unparseable lines
});
process.stdin.on("end", () => {
  // Flush what is queued, then close the server's stdin so it can shut down on EOF. Bounded: if the server
  // stops answering, close anyway after 10 s and kill it 5 s later, so the proxy never lingers orphaned.
  const deadline = Date.now() + 10_000;
  const finish = () => {
    if ((inflight === null && !queue.length) || Date.now() > deadline) {
      child.stdin.end();
      setTimeout(() => child.kill(), 5_000).unref();
    } else setTimeout(finish, 50);
  };
  finish();
});

lines(child.stdout, (line) => {
  process.stdout.write(line + "\n");
  const msg = parse(line);
  if (msg && !msg.method && msg.id !== undefined && key(msg.id) === inflight) {
    inflight = null;
    pump();
  }
});
