# Setup

About 15 minutes, plus a ~2 GB model download. Tested on macOS with Node.js 22+ and QMD 2.8.3. Linux works the same way. On Windows, use WSL.

Replace `/ABSOLUTE/PATH/TO/brain` below with the folder your copy lives in (run `pwd` inside it).

## 1. Prerequisites

| Tool | Check | Needed for |
|---|---|---|
| Node.js 22 or newer | `node --version` | QMD and the scripts |
| git | `git --version` | Versioning and pull requests |
| GitHub CLI (optional) | `gh --version` | Opening pull requests from the AI |

## 2. Make your own private copy

On GitHub, click **Use this template → Create a new repository**, and set it to **Private**. This repo will hold personal information. Then:

```bash
git clone https://github.com/<you>/<your-brain>.git ~/brain
cd ~/brain
git config core.hooksPath system/scripts/hooks   # blocks direct commits to main; republishes after merges
```

Optional: in your repo's **Settings → Branches**, protect `main` and require the `check` status check. Then nothing reaches `main` without a pull request. On a private repo this needs a paid GitHub plan (Pro or above). On GitHub Free, the pre-commit hook above is your guardrail.

## 3. Install QMD (local search)

[QMD](https://github.com/tobi/qmd) is a local search engine for Markdown files. It does keyword and semantic search, runs entirely on your machine, and has a built-in MCP server.

```bash
npm install -g @tobilu/qmd@2.8.3
qmd --version
qmd pull            # downloads the embedding, reranking, and query models (~2 GB) to ~/.cache/qmd/models
```

If `npm install -g` asks for `sudo`, install into a folder you own instead:

```bash
npm install --prefix ~/.local/share/ai-brain/tools/qmd @tobilu/qmd@2.8.3
export PATH="$HOME/.local/share/ai-brain/tools/qmd/node_modules/.bin:$PATH"
qmd pull
```

(Add that `export PATH=…` line to your shell profile, such as `~/.zshrc`, so `qmd` works in new terminals, in `publish.sh`, and in the shells your AI agent runs.)

## 4. Publish and index

```bash
system/scripts/publish.sh
qmd --index brain search "bakery"                 # keyword search, should list the Alex Example CRM records
qmd --index brain query "what is the owner focused on now"   # hybrid search (first run loads the models)
```

`publish.sh` copies only approved (`main`), current records into `~/.local/share/ai-brain/published/` and points four search collections at it:

| Collection | Holds | Searched by default |
|---|---|---|
| `brain` | `status: current` records | Yes |
| `brain-history` | Superseded statements (`history/changes/`) | No, opt in with `collections: ["brain-history"]` |
| `brain-archive` | `archive/` | No, opt in |
| `brain-bootstrap` | `AGENTS.md`, `system/routing.md`, `context/*.md` | No, read with `get` |

The `post-merge` hook reruns it after every merge or `git pull` on `main`.

## 5. Connect Claude

GUI apps don't see your shell `PATH`, so use absolute paths. Find them with:

```bash
which node                                        # e.g. /usr/local/bin/node or /opt/homebrew/bin/node
echo "$(npm root -g)/@tobilu/qmd/bin/qmd"         # the QMD entry point (or the --prefix path from step 3)
```

The MCP server is `qmd --index brain mcp`. It's launched through `system/scripts/mcp-serial.mjs`, a tiny wrapper that sends one request at a time. Without it, QMD 2.8.3 can drop a response when an agent sends two requests while the models are loading, and the chat hangs.

### Claude Code

```bash
claude mcp add -s user brain -- /ABSOLUTE/PATH/TO/node /ABSOLUTE/PATH/TO/brain/system/scripts/mcp-serial.mjs -- /ABSOLUTE/PATH/TO/node /ABSOLUTE/PATH/TO/qmd/bin/qmd --index brain mcp
claude mcp get brain     # should say connected
```

Then paste the block from [`claude-code-snippet.md`](claude-code-snippet.md) into `~/.claude/CLAUDE.md`, so every Claude Code session knows the brain exists.

### Claude Desktop

Open **Settings → Developer → Edit Config** and merge the `mcpServers.brain` entry from [`claude_desktop_config.example.json`](claude_desktop_config.example.json) into the file (keep any keys already there). Fully quit (⌘Q) and reopen Claude. The `brain` tools appear in the tools menu.

Optional: paste the same snippet into Claude's personal-preferences setting, or into a Project's instructions.

### Codex / other MCP clients

Same command, different registration. For Codex: `codex mcp add brain -- <the same command as Claude Code>`. For other clients, use the command and args from the Desktop example.

## 6. Verify

Start a new chat and ask:

> Using my brain, what is the owner focused on right now? Cite your sources.

A working setup reads `brain-bootstrap/context/map.md`, runs `query`, opens a record with `get`, and answers with `(source: goals/current-priorities.md)`. Then ask about the florist from the example proposal. It should say that's **not in the brain**, because the inbox is never searched.

## 7. Everyday use

| You want to | Do this |
|---|---|
| Remember something | Tell Claude Code or Codex in this repo: *"brain: I started a pottery class on Tuesdays."* It files a proposal ([`system/prompts/propose.md`](../system/prompts/propose.md)). Chat apps without file access write the proposal as a block for you to save or paste |
| Apply proposals | Weekly, in Claude Code in this repo: *"consolidate the brain"* (the `brain-consolidate` skill). Review the PR, then merge |
| Update search | Automatic when `main` changes on this machine (post-merge hook), so after merging on github.com, `git pull` on `main`. Or run `system/scripts/publish.sh`. To automate the pull, see the background sync add-on in [`add-ons.md`](add-ons.md) |
| Check the repo | `node system/scripts/check.mjs` |

## Undo everything

```bash
claude mcp remove -s user brain                    # Claude Code
# Claude Desktop: delete mcpServers.brain from the config file
rm -rf ~/.local/share/ai-brain                     # published copy
rm -f ~/.cache/qmd/brain.sqlite* ~/.config/qmd/brain.yml   # search index
npm uninstall -g @tobilu/qmd && rm -rf ~/.cache/qmd/models # QMD and its models
```
