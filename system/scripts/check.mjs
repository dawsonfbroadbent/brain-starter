#!/usr/bin/env node
// Brain validator. No dependencies; needs Node.js 18+.
//
//   node system/scripts/check.mjs                      check the whole repo (exit 1 on any FAIL)
//   node system/scripts/check.mjs --stamp context/me.md  write source and body hashes into a context file
//   node system/scripts/check.mjs --root <dir>         check another copy (publish.sh uses this)
//
// Checks: record frontmatter (required fields, allowed type/status, dates, sources, id = file name),
// context files (source hashes = STALE check, body hash = HAND-EDITED check, word range),
// relative Markdown links, and symlinks (refused, so publishing can't copy files from outside the repo).
// WARN lines (overdue review_by) never fail the check.

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, readdirSync, lstatSync, existsSync } from "node:fs";
import { join, dirname, relative, resolve, basename, sep } from "node:path";
import { fileURLToPath } from "node:url";

const CONTENT = /^(profile|goals|writing|education|work|ventures|projects|crm|life|knowledge|history|archive|inbox)\//;
const SKIP_DIRS = new Set([".git", "node_modules", ".obsidian"]);
const REQUIRED = ["type", "status", "updated", "verified", "sources"];
const TYPES = new Set(["profile", "preference", "goal", "role", "venture", "project", "person", "company", "interaction",
  "opportunity", "knowledge", "decision", "lesson", "change", "context", "capture", "proposal"]);
const STATUSES = new Set(["unpopulated", "draft", "current", "superseded", "archived"]);
const ID_TYPES = new Set(["person", "company", "interaction", "opportunity", "role", "venture", "project", "decision",
  "lesson", "change", "proposal"]);
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TODAY = new Date().toLocaleDateString("en-CA"); // local YYYY-MM-DD

const sha12 = (buf) => createHash("sha256").update(buf).digest("hex").slice(0, 12);

// ---------- minimal YAML (the subset records use) ----------
function scalar(raw) {
  let v = raw.trim();
  if (/^["']/.test(v)) {
    const q = v[0], end = v.indexOf(q, 1);
    return end > 0 ? v.slice(1, end) : v.slice(1);
  }
  v = v.replace(/\s+#.*$/, "").trim();
  if (v === "" || v === "null" || v === "~") return null;
  if (v === "true") return true;
  if (v === "false") return false;
  if (v === "[]") return [];
  if (/^\[.*\]$/.test(v)) return v.slice(1, -1).split(",").map((s) => scalar(s)).filter((s) => s !== null);
  return v;
}

export function parseYaml(text) {
  const out = {};
  let key = null, item = null;
  for (const line of text.split("\n")) {
    if (!line.trim() || /^\s*#/.test(line)) continue;
    const top = line.match(/^([A-Za-z_][\w-]*):(.*)$/);
    if (top) {
      key = top[1];
      out[key] = top[2].trim() === "" || /^\s*#/.test(top[2]) ? [] : scalar(top[2]);
      item = null;
      continue;
    }
    const li = line.match(/^\s+-\s+(.*)$/);
    if (li && key && Array.isArray(out[key])) {
      const kv = li[1].match(/^([\w-]+):(.*)$/);
      if (kv) { item = { [kv[1]]: scalar(kv[2]) }; out[key].push(item); }
      else { item = null; out[key].push(scalar(li[1])); }
      continue;
    }
    const cont = line.match(/^\s+([\w-]+):(.*)$/);
    if (cont && item) { item[cont[1]] = scalar(cont[2]); continue; }
    throw new Error(`cannot parse frontmatter line: ${line.trim()}`);
  }
  return out;
}

export function split(text) {
  if (!text.startsWith("---\n")) return null;
  const end = text.indexOf("\n---\n", 3);
  if (end < 0) return null;
  return { yaml: text.slice(4, end + 1), body: text.slice(end + 5) };
}

function wordCount(body) {
  return body.replace(/<!--[\s\S]*?-->/g, "").split("\n").filter((l) => !/^#\s/.test(l)).join(" ")
    .split(/\s+/).filter(Boolean).length;
}

// ---------- walking ----------
function walk(root, dir = root, files = [], links = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const abs = join(dir, name), st = lstatSync(abs);
    const rel = relative(root, abs).split(sep).join("/");
    if (st.isSymbolicLink()) links.push(rel);
    else if (st.isDirectory()) walk(root, abs, files, links);
    else if (name.endsWith(".md")) files.push(rel);
  }
  return { files, links };
}

function read(root, rel) {
  const text = readFileSync(join(root, rel), "utf8");
  const parts = split(text);
  if (!parts) return { error: "missing YAML frontmatter (--- ... ---)" };
  try { return { data: parseYaml(parts.yaml), body: parts.body, text }; }
  catch (e) { return { error: e.message }; }
}

// ---------- checks ----------
function checkRecord(rel, d, fail, warn) {
  for (const f of REQUIRED) if (!(f in d)) fail(rel, `missing required field \`${f}\``);
  if ("type" in d && !TYPES.has(d.type)) fail(rel, `type \`${d.type}\` is not allowed (see system/routing.md)`);
  if (d.type === "context") fail(rel, "type `context` is only allowed in context/");
  if ("status" in d && !STATUSES.has(d.status)) fail(rel, `status \`${d.status}\` is not allowed`);
  if ("updated" in d && !DATE.test(String(d.updated))) fail(rel, "`updated` must be YYYY-MM-DD");
  if ("verified" in d && d.verified !== null && !DATE.test(String(d.verified))) fail(rel, "`verified` must be null or YYYY-MM-DD");
  if ("review_by" in d) {
    if (!DATE.test(String(d.review_by))) fail(rel, "`review_by` must be YYYY-MM-DD");
    else if (d.status === "current" && String(d.review_by) < TODAY) warn(rel, `review overdue (review_by ${d.review_by})`);
  }
  if ("sources" in d) {
    if (!Array.isArray(d.sources)) fail(rel, "`sources` must be a list ([] when empty)");
    else d.sources.forEach((s, i) => { if (!s || typeof s !== "object" || !s.ref) fail(rel, `sources[${i}] needs a \`ref\``); });
  }
  const want = basename(rel, ".md");
  if (ID_TYPES.has(d.type) && !d.id) fail(rel, `type \`${d.type}\` requires an \`id\``);
  if (d.id && d.id !== want) fail(rel, `id \`${d.id}\` must equal the file name \`${want}\``);
}

function checkContext(root, rel, rec, fail) {
  const d = rec.data;
  if (d.type !== "context") fail(rel, "type must be `context`");
  if (d.status === "unpopulated") {
    if (Array.isArray(d.sources) && d.sources.length) fail(rel, "an unpopulated context file must have `sources: []`");
    return;
  }
  if (d.status !== "current") return fail(rel, "context status must be `current` or `unpopulated`");
  if (!DATE.test(String(d.generated))) fail(rel, "`generated` must be YYYY-MM-DD");
  if (!Array.isArray(d.sources) || !d.sources.length) return fail(rel, "a current context file needs sources");
  for (const s of d.sources) {
    if (!s?.path || !s?.sha256) { fail(rel, "each source needs `path` and `sha256`"); continue; }
    const p = join(root, s.path);
    if (!existsSync(p)) { fail(rel, `source ${s.path} does not exist`); continue; }
    if (sha12(readFileSync(p)) !== String(s.sha256)) fail(rel, `STALE: ${s.path} changed after generation. Regenerate, then --stamp.`);
    const src = read(root, s.path);
    if (src.error || src.data.status !== "current") fail(rel, `source ${s.path} is not a \`status: current\` record`);
  }
  if (sha12(rec.body) !== String(d.body_sha256)) fail(rel, "HAND-EDITED: the body changed after generation. Regenerate, then --stamp.");
  const range = String(d.word_range ?? "").match(/^(\d+)-(\d+)$/);
  if (!range) return fail(rel, "`word_range` must be <min>-<max>");
  const words = wordCount(rec.body);
  if (words > +range[2]) fail(rel, `${words} words exceeds the maximum of ${range[2]}`);
  if (words < +range[1] && d.partial !== true) fail(rel, `${words} words is below the minimum of ${range[1]}; set \`partial: true\` if the sources support no more`);
}

function checkLinks(root, rel, text, fail) {
  const clean = text.replace(/```[\s\S]*?```/g, "").replace(/`[^`\n]*`/g, "");
  for (const m of clean.matchAll(/\]\(([^)\s]+)\)/g)) {
    const target = m[1];
    if (/^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith("#") || target.includes("<")) continue;
    const path = decodeURIComponent(target.split("#")[0]);
    if (!path) continue;
    const abs = resolve(root, dirname(rel), path);
    if (!abs.startsWith(resolve(root)) || !existsSync(abs)) fail(rel, `broken link -> ${target}`);
  }
}

function run(root) {
  const fails = [], warns = [];
  const fail = (rel, msg) => fails.push(`FAIL ${rel}: ${msg}`);
  const warn = (rel, msg) => warns.push(`WARN ${rel}: ${msg}`);
  const { files, links } = walk(root);
  for (const l of links) fail(l, "symlinks are not allowed");
  let records = 0, contexts = 0;
  for (const rel of files.sort()) {
    const isReadme = basename(rel) === "README.md";
    if (!rel.startsWith("system/templates/")) checkLinks(root, rel, readFileSync(join(root, rel), "utf8"), fail);
    if (isReadme) continue;
    if (/^inbox\/processed\/.*-DIFF-SUMMARY\.md$/.test(rel)) continue; // consolidation PR bodies: no frontmatter
    if (rel.startsWith("context/")) {
      const rec = read(root, rel);
      if (rec.error) fail(rel, rec.error); else { checkContext(root, rel, rec, fail); contexts++; }
    } else if (CONTENT.test(rel)) {
      const rec = read(root, rel);
      if (rec.error) fail(rel, rec.error); else { checkRecord(rel, rec.data, fail, warn); records++; }
    }
  }
  for (const line of [...warns, ...fails]) console.log(line);
  console.log(`check: ${records} records, ${contexts} context files, ${warns.length} warning(s), ${fails.length} failure(s)`);
  return fails.length === 0;
}

// Fill in body_sha256 and each source's sha256 in a context file.
function stamp(root, rel) {
  const text = readFileSync(join(root, rel), "utf8");
  const parts = split(text);
  if (!parts) throw new Error(`${rel}: missing frontmatter`);
  const data = parseYaml(parts.yaml);
  const hashes = (data.sources || []).map((s) => sha12(readFileSync(join(root, s.path))));
  let i = 0;
  const yaml = parts.yaml.split("\n").map((line) => {
    if (/^body_sha256:/.test(line)) return `body_sha256: ${sha12(parts.body)}`;
    if (/^\s+sha256:/.test(line)) return line.replace(/sha256:.*/, `sha256: ${hashes[i++]}`);
    return line;
  }).join("\n");
  if (i !== hashes.length) throw new Error(`${rel}: every source needs a \`sha256:\` line to fill in`);
  writeFileSync(join(root, rel), `---\n${yaml}---\n${parts.body}`);
  console.log(`stamped ${rel} (${hashes.length} sources)`);
}

const args = process.argv.slice(2);
const rootArg = args.indexOf("--root");
const root = resolve(rootArg >= 0 ? args[rootArg + 1] : join(dirname(fileURLToPath(import.meta.url)), "..", ".."));
const stampArg = args.indexOf("--stamp");
if (stampArg >= 0) {
  for (const rel of args.slice(stampArg + 1).filter((a) => !a.startsWith("--") && a !== args[rootArg + 1])) stamp(root, rel);
} else {
  process.exit(run(root) ? 0 : 1);
}
