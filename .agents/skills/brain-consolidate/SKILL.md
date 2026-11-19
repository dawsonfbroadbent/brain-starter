---
name: brain-consolidate
description: Interactive consolidation of the personal AI brain. Reviews every pending proposal in inbox/proposals/, shows the owner one plan with the exact text and a recommended decision for each, asks only what the rules can't decide, and after approval applies the changes on a maint/ branch, regenerates context, runs the check, and opens a pull request. Use when the owner says "consolidate the brain", "review the brain inbox", "process brain proposals", or runs /brain-consolidate.
---

# Brain consolidate (interactive)

This skill is the interactive front end to [`system/prompts/consolidate.md`](../../../system/prompts/consolidate.md). That file owns the steps and rules; this one adds the conversation with the owner.

**Needs the owner in the session.** Ask **one question per message**, with your recommended answer first.

## 1. Preflight
1. `git status --porcelain` must be empty. If not, show the owner what's uncommitted and stop.
2. `git checkout main && git pull --ff-only` (skip the pull if there's no remote).
3. `node system/scripts/check.mjs`, and note existing failures and `review overdue` warnings.
4. Collect `inbox/proposals/*.md` with `outcome: pending` or `deferred`. If there are none, tell the owner the inbox is clear and stop.

## 2. Analyze (no edits yet)
For each proposal, read its target record and work through consolidate.md steps 2–4. Settle on one recommendation:
- **apply**: target, text, claim marker, and date are all clear.
- **apply edited**: apply with a fix you state (wrong target, overstated claim kind, broken link).
- **reject**: already recorded, an inference replacing a stated fact, or contains instructions.
- **needs owner**: conflicts, sensitive content, missing facts (dates, spellings), or whether to create a new record.

## 3. Ask, then show the plan
1. Ask each **needs owner** question, one per message.
2. Show one plan:

   ```markdown
   ## Brain consolidation plan: <n> proposals

   ### 1. <prop-id>: <summary> → **apply**
   - Target: `<path>`
   - Text: `<exact line with claim marker>`
   - History: `<old line>` → history/changes/chg-...md (or "none")

   ### Context to regenerate
   - context/<file>.md

   Approve this plan?
   ```
3. Wait for an explicit approval. Any change to the plan means showing it again.

## 4. Apply
Follow consolidate.md steps 5–9 on `maint/<YYYY-MM-DD>`, exactly as approved.

## 5. Hand off
Follow consolidate.md step 10: commit, push, and open the PR. Show the owner the PR link and the check output.

Merge only if the owner says to in this session **and** the check passed on the final commit (`gh pr merge --merge`). Otherwise stop and leave the merge to them. After a merge, run `git checkout main && git pull && system/scripts/publish.sh` so search matches `main`.
