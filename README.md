# Personal AI Brain: Starter

A folder of plain Markdown files that holds your personal context (who you are, what you're working on, the people you work with, how you like to write) so **every AI you use** can read it, search it, and cite it. Changes go through Git pull requests, so the AI suggests and you decide.

Everything in this template is fictional ("Alex Example") so you can see how it works before you replace it with your own.

## How it works

**Read loop:** your AI answers questions from approved facts, with sources.

```text
main branch ──► publish.sh ──► local search index (QMD) ──► MCP ──► Claude / Codex / any MCP client
(approved)      (current records only)                                "(source: profile/identity.md)"
```

**Write loop:** your AI proposes, and you approve.

```text
"brain: I started a new job"  ──►  proposal in inbox/  ──►  consolidate on a branch  ──►  pull request  ──►  you merge  ──►  searchable
 (you, in Claude Code or Codex)      (unapproved)            (records + history + context)   (you review)     (= approval)
```

Filing a proposal needs an agent with file and git access (Claude Code, Codex). Chat apps without file access, like Claude Desktop, write the proposal as a Markdown block for you to save into `inbox/proposals/` or paste into a Claude Code session.

## The 3 rules

1. **Every fact has a source and a confidence level.** Each line ends with a marker: `[confirmed 2026-03-02 · me:2026-03-02]`, `[tentative]` (a plan), `[inferred]` (the AI's guess), or `[historical 2020..2024]`. Old facts move to `history/` instead of being overwritten.
2. **AI proposes; you approve through pull requests.** AIs never edit facts directly. They file proposals, consolidation turns those into a PR, and your merge is the approval. Nothing reaches search until it's on `main`.
3. **Plain text, so any AI can read it.** Markdown and YAML in Git. No database or vendor lock-in. Open it in any editor or in Obsidian, and use it from any AI tool.

## Quickstart (about 15 minutes of setup plus a ~2 GB model download, then the interview at your own pace)

1. Click **Use this template → Create a new repository** and make it **Private**. It will hold personal information.
2. Clone it and open the folder in Claude Code (or Codex, or any AI coding agent).
3. Paste this prompt:

> I'm setting up my personal AI brain from this starter template. First read `README.md`, `AGENTS.md`, `system/routing.md`, and `setup/README.md`. Then guide me through these phases in order. Ask me **one question at a time**, explain each step in a sentence, and **ask before installing anything or changing any file outside this folder**.
>
> 1. **Check:** confirm the repo is private (or local only), and check for Node.js 22+, git, and the GitHub CLI. Tell me what's missing and how to install it.
> 2. **Install:** run `git config core.hooksPath system/scripts/hooks`, then install QMD and its models following `setup/README.md`.
> 3. **Clear the examples:** on a new branch `maint/<today>-setup`, delete every file whose `sources` include `example:alex` (including the example proposal in `inbox/proposals/`). Keep the READMEs, templates, and `system/`.
> 4. **Interview me:** ask about me one question at a time: who I am, what I'm focused on now, how I want AI to work with me, how I write, and the key projects and people in my life. I can skip any question. Write my answers into records using the templates in `system/templates/` and the homes in `system/routing.md`. Use my own words, end each line with `[confirmed <today> · me:<today>]`, list `me:<today>` in `sources`, and keep `verified: null`. Never invent facts. Ask before recording anything sensitive (health, finances, legal matters, other people's private details).
> 5. **Generate context:** regenerate `context/map.md`, `me.md`, and `now.md` following `system/prompts/consolidate.md#generate-context`, stamp them with `node system/scripts/check.mjs --stamp`, and run `node system/scripts/check.mjs` until it passes.
> 6. **Review:** show me a short summary of every record, commit on the branch, and open a pull request (or tell me how to merge locally). Wait for me to merge.
> 7. **Connect:** run `system/scripts/publish.sh`, then connect the `brain` MCP server to Claude Code and Claude Desktop following `setup/README.md`, and add `setup/claude-code-snippet.md` to my `~/.claude/CLAUDE.md` with my real paths. Show me each config change before you make it.
> 8. **Verify:** run a test search, then tell me what to ask in a new chat to confirm everything works.

Prefer doing it by hand? Follow [`setup/README.md`](setup/README.md).

## Everyday use

- **Ask:** "Using my brain, who is Jordan and what did we last talk about?" → the answer cites `crm/people/person-jordan-sample.md`.
- **Remember:** in Claude Code or Codex, "brain: Jordan referred a florist who needs an ordering site." → a proposal lands in `inbox/proposals/`.
- **Review weekly:** in Claude Code, "consolidate the brain" → one plan, one PR, you merge.

More in [`setup/README.md`](setup/README.md#7-everyday-use).

## What's inside

| Path | Holds |
|---|---|
| `context/` | Generated summaries agents read first: `map.md` (which file answers what), `me.md`, `now.md` |
| `profile/` `goals/` `writing/` `education/` `work/` `ventures/` `projects/` `crm/` `life/` `knowledge/` | Your records, one fact in one home |
| `history/` `archive/` | Decisions, replaced facts, inactive records |
| `inbox/` | Unapproved proposals. Never treated as fact |
| `system/` | Routing rules, templates, the propose and consolidate procedures, scripts |
| `setup/` | Install guide and sample configs |
| `AGENTS.md` | The rules every AI follows in this repo (`CLAUDE.md` imports it) |

Each folder has a README explaining what goes there.

## License

MIT. See [`LICENSE`](LICENSE).
