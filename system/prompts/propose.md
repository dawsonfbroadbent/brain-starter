# Propose

Turn something the owner said ("brain: I started a new job at Acme") into a **proposal** in `inbox/proposals/`. A proposal changes nothing. Consolidation ([`consolidate.md`](consolidate.md)) decides what's applied, and the owner approves by merging.

Read `AGENTS.md` and `system/routing.md` first.

## Rules

- One proposal per target change. Two facts from one sentence get two proposals.
- Quote the owner's own words as evidence. Don't paraphrase them into something stronger.
- Use the **statement date** (when it was said or happened), not today's date, unless they're the same.
- Pick the claim kind honestly: a plan is `tentative`; your own reasoning is `inferred`.
- Fill in **Sensitivity** when the fact is about health, finances, legal matters, precise location, or someone else's private life.
- Never write to records, `context/`, or `main`.

## Steps (agent with file and git access, e.g. Claude Code or Codex)

1. From an up-to-date `main`, create a branch: `capture/<YYYYMMDD>-<slug>`.
2. Copy `system/templates/proposed-update.md` to `inbox/proposals/prop-<YYYYMMDD>-<slug>.md` and fill in every section. Name the target record if you know it (`system/routing.md`), or write `new record` and the template name.
3. Run `node system/scripts/check.mjs`. Fix anything your file broke.
4. Commit (`capture: <one-line summary>`).
5. If the repo has a GitHub remote: push and open a PR (`gh pr create --base main --title "capture: <summary>" --body "<one line>"`). The owner can merge capture PRs quickly, because inbox files are never treated as fact.
   No remote: leave the branch and tell the owner its name. They merge it with `git checkout main && git merge <branch>`.
6. Tell the owner the proposal id and the PR link (or branch).

## Chat-only surfaces (no file access)

Write the filled-in proposal as one Markdown block and tell the owner to save it as `inbox/proposals/prop-<YYYYMMDD>-<slug>.md`, or paste it into a Claude Code session in this repo with "file this proposal".

## Example

The owner says on 2026-03-20: *"brain: Jordan called yesterday and sent me a florist who needs the same thing."*
The result is `inbox/proposals/prop-20260320-jordan-sample-referral.md` (fictional).
