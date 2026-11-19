# inbox/

**Nothing here is a fact.** It's unapproved material waiting for review. Agents never cite it or answer from it, and search never indexes it.

| Folder | Holds |
|---|---|
| `proposals/` | `prop-YYYYMMDD-<slug>.md`: one proposed change to one record, with evidence (template: `system/templates/proposed-update.md`) |
| `captures/` | Raw evidence an agent collected (optional) |
| `processed/` | Proposals that consolidation applied or rejected, plus each run's `DIFF-SUMMARY.md` |

Flow: an AI files a proposal → consolidation applies it on a branch → you review the pull request → **your merge is the approval**. See [`system/prompts/propose.md`](../system/prompts/propose.md) and [`system/prompts/consolidate.md`](../system/prompts/consolidate.md).

Example: `proposals/prop-20260320-jordan-sample-referral.md`.
