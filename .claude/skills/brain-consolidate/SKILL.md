---
name: brain-consolidate
description: Interactive consolidation of the personal AI brain. Reviews every pending proposal in inbox/proposals/, shows the owner one plan with the exact text and a recommended decision for each, asks only what the rules can't decide, and after approval applies the changes on a maint/ branch, regenerates context, runs the check, and opens a pull request. Use when the owner says "consolidate the brain", "review the brain inbox", "process brain proposals", or runs /brain-consolidate.
---

# Brain consolidate

Read and follow [`.agents/skills/brain-consolidate/SKILL.md`](../../../.agents/skills/brain-consolidate/SKILL.md) from the repo root. That file is the shared procedure for Claude Code and Codex.

This is a copy rather than a symlink because `check.mjs` and `publish.sh` refuse symlinks. Keep `name` and `description` identical to the shared file's.
