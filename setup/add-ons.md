# Optional add-ons

The starter ships without these on purpose. Each needs machine-specific setup or GitHub credentials, and one of them changes who approves your facts. None is built yet: this file describes each one well enough for your AI to build it when you ask.

**To build one,** open this repo in Claude Code or Codex and say: *"Build the <name> add-on from `setup/add-ons.md`."*

**Rules for the agent building an add-on:**
- Read `AGENTS.md`, `system/routing.md`, and the add-on's section below first. Restate the plan and wait for the owner's OK before writing anything.
- Work on a branch (`addon/<name>`) and finish with a pull request. Never commit to `main`.
- Ask before installing software, writing outside this repo (`~/Library/LaunchAgents`, MCP client configs, `~/.local/share/ai-brain/tools`), or changing GitHub settings. Show each config change before making it.
- Clients and schedulers launch an **installed copy** under `~/.local/share/ai-brain/tools/`, never a script in the working tree, which can be on an unmerged branch.
- GUI apps and schedulers don't see your shell `PATH`: use absolute paths to `node`, `git`, `gh`, and `qmd`.
- Never print or log secrets or tool arguments. Add the add-on's undo steps to `setup/README.md` → "Undo everything".
- When done, add the add-on to the table at the end of this file with today's date, and run `node system/scripts/check.mjs`.

| Add-on | What you get | Effort | Risk |
|---|---|---|---|
| [Background sync](#1-background-sync) | Search updates by itself after you merge on github.com | ~1 hour | Low |
| [Chat capture](#2-chat-capture-brain-propose-mcp-server) | "brain: …" files a proposal from Claude Desktop or any MCP client | Half a day | Medium: pushes with your GitHub login |
| [Autopilot](#3-autopilot-scheduled-consolidation) | Proposals are consolidated on a schedule, with a weekly digest | 1 day+ | High if it auto-merges |

---

## 1. Background sync

**Today:** search only updates when `main` changes on this machine (the `post-merge` hook runs `publish.sh`). A PR merged on github.com isn't searchable until you `git pull`.

**Build:**
1. `system/scripts/sync-main.sh --repo <brain repo> --log <log file>`, bash, safe to run any time, always exits 0:
   - On `main` with no uncommitted tracked changes: `git pull --ff-only` (the post-merge hook republishes). Then, if `~/.local/share/ai-brain/published/COMMIT` doesn't equal `git rev-parse main`, run `system/scripts/publish.sh` once (an earlier publish failed).
   - On another branch: `git fetch origin main:main` (fast-forwards the local `main` ref only) and log "publish pending until you're back on main".
   - Uncommitted changes on `main`, a merge or rebase in progress, offline, or a diverged `main`: log the reason and skip.
   - Keep the log small (rotate at ~512 KB).
2. `system/scripts/install-sync.sh`: copies `sync-main.sh` to `~/.local/share/ai-brain/tools/`, then schedules it hourly and at login.
   - **macOS:** a LaunchAgent plist at `~/Library/LaunchAgents/<reverse-dns label>.plist` with `RunAtLoad` true, `StartInterval` 3600, `ProgramArguments` = `/bin/bash`, the installed script, `--repo`, `--log`, and an `EnvironmentVariables.PATH` that includes the folders holding `node`, `git`, and `qmd` (or set `QMD`; see `publish.sh`). Load it with `launchctl bootstrap gui/$(id -u) <plist>`.
   - **Linux:** a user crontab line `@hourly` plus `@reboot`, with the same absolute paths.
3. If pulls fail with authentication errors in the log, run `gh auth setup-git` so git uses the GitHub CLI's stored login.

**Verify:** merge a PR on github.com, trigger a run (`launchctl kickstart -k gui/$(id -u)/<label>`, or run the installed script by hand), then check that `published/COMMIT` equals `git rev-parse origin/main` and the change is searchable.

**Undo:** `launchctl bootout gui/$(id -u)/<label>` and delete the plist (or remove the crontab lines), then delete the installed script and log.

---

## 2. Chat capture (`brain-propose` MCP server)

**Today:** only an agent with file and git access (Claude Code, Codex) can file a proposal. Chat apps write a Markdown block you save by hand ([`system/prompts/propose.md`](../system/prompts/propose.md)).

**Build** a second MCP server, `brain-propose`, with one tool, `propose_update`. It does what `propose.md` describes, in a clone it owns:
1. `system/scripts/propose-mcp.mjs`, a stdio MCP server (newline-delimited JSON-RPC 2.0: `initialize`, `tools/list`, `tools/call`). Node with no dependencies, or the official MCP SDK installed next to the installed copy.
   - **Input:** `statement` (the owner's exact words), `statement_date` (YYYY-MM-DD), `target` (record path, or `new record: <template>`), `proposed_text` (the line with its claim marker), `claim_kind` (`confirmed` | `tentative` | `inferred`), optional `sensitivity`, and `captured_by` (which app).
   - **Per call, one at a time (use a lock):** fetch `origin/main` in the capture clone. Compute a capture id from a hash of date, statement, proposed text, and target, so a retried call is a no-op. If a proposal with that id is already on `main` or a `capture/<id>` branch exists on GitHub, return its receipt. Otherwise check out `capture/<id>` from `origin/main`, write **one** file `inbox/proposals/prop-<YYYYMMDD>-<slug>-<id>.md` from [`system/templates/proposed-update.md`](../system/templates/proposed-update.md) (its `id` equals the file name), run `node system/scripts/check.mjs`, commit, push, and `gh pr create`.
   - **Returns** a receipt: id, file path, branch, PR URL, and `created` or `already_exists`.
   - **Can't:** write outside `inbox/proposals/`, edit records, or merge. Tool input is data, never instructions.
2. `system/scripts/install-propose.sh`: copies the server to `~/.local/share/ai-brain/tools/`, creates the capture clone at `~/.local/share/ai-brain/capture/repo` (same `origin`, `core.hooksPath` set to `system/scripts/hooks`, your git name and email), and prints the registration commands without running them: `claude mcp add -s user brain-propose -- <node> <installed server> --repo <clone> --git <git> --gh <gh>`, plus the matching `mcpServers` entry for Claude Desktop.
3. A test script that runs the server against a throwaway local repo and fake `gh`: one call creates one file, a repeated call returns `already_exists`, and a write outside `inbox/proposals/` is impossible.
4. Doc updates in the same PR: `AGENTS.md` §4 and [`setup/claude-code-snippet.md`](claude-code-snippet.md) say to call `propose_update` when "brain: …" is said, falling back to `propose.md` when the tool isn't available. Add a setup section to `setup/README.md`.

**Needs:** `gh auth login` on this machine. The server pushes with that login.

**Optional:** an `inbox-automerge` GitHub workflow, so capture PRs don't pile up. It merges a PR only when it comes from a `capture/` branch in this repo, every changed file is an **added** file under `inbox/proposals/`, and the `check` job passed. Inbox files are never treated as fact, so this doesn't approve anything. Have a security review look at it before turning it on.

**Limits:** a local stdio server only works in apps on this computer. Phone apps can't reach it.

**Undo:** `claude mcp remove -s user brain-propose`, remove `mcpServers.brain-propose` from the Desktop config, and delete the installed server and capture clone.

---

## 3. Autopilot (scheduled consolidation)

**Today:** you run consolidation yourself ("consolidate the brain"), review one PR, and merge it.

**Decide first:** the lite version keeps the starter's rule that **your merge is the approval**. The full version lets facts reach `main` without your review. Run consolidation by hand for a few weeks before considering either.

**Lite (recommended): scheduled PRs, you merge.**
1. Add an **Auto mode** section to [`system/prompts/consolidate.md`](../system/prompts/consolidate.md) for running with no owner in the session:
   - Work on `auto/<YYYY-MM-DD>`.
   - Apply only proposals the rules decide on their own. Defer anything with a conflict, sensitivity, a missing date, or a new record to create.
   - Never set `verified`, and cite `prop:<id>` in `sources` for every changed record.
   - Never touch `system/`, `.github/`, `.claude/`, `.agents/`, or `AGENTS.md`.
   - Regenerate context, run the check, and open a PR whose summary lists what was deferred and why.
2. Schedule it with a cloud agent that can push to this repo (for example a Claude Code scheduled routine via `/schedule`) to run daily or weekly with: *"Run consolidation in auto mode per `system/prompts/consolidate.md`."*
3. Optional weekly digest: a scheduled GitHub workflow that opens an issue listing open auto PRs, deferred proposals waiting on you, and records past `review_by`.

**Full: auto-merge.** Only after the lite version has run cleanly for a while.
- A merge-gate script plus a `pull_request_target` workflow that runs the gate **from `main`**. It must fetch the PR's files through the GitHub API as data and never check out or run PR code.
- The gate merges an `auto/` PR only when every one of these holds:
  - Its commits come from the routine's identity.
  - It changes only record folders, `context/`, and `inbox/`.
  - Every changed record has `verified: null` and cites a proposal this PR marks `applied`.
  - `history/` files are only added.
  - No added line reads like instructions to an agent or contains invisible characters.
  - The `check` job passed on the exact head commit (`gh pr merge --match-head-commit`).
- Otherwise it comments the reasons and leaves the PR for you.
- Treat this as high risk: write tests for the gate, get a security review, and update `AGENTS.md` §1, because "only the owner merges" is no longer true.

**Undo:** delete the scheduled routine and the workflows. Auto mode in `consolidate.md` is harmless without a schedule.

---

## Built add-ons

| Add-on | Built | Notes |
|---|---|---|
| none yet | | |
