# context/

**Generated files. Never edit by hand.** Agents read these first.

| File | What it is | Built from |
|---|---|---|
| `map.md` | Which record answers which question. Agents read it before searching | Every record it links to |
| `me.md` | Stable summary of who you are | `profile/`, `goals/long-term.md`, `education/overview.md`, `work/experience.md`, `life/` |
| `now.md` | What you're focused on right now | `goals/current-priorities.md`, plus active roles, ventures, and projects |

Each file lists its sources with a short SHA-256 hash. `node system/scripts/check.mjs` recomputes them:

- **STALE**: a source changed after the file was generated. Regenerate.
- **HAND-EDITED**: someone edited the body. Regenerate.

The procedure is in [`system/prompts/consolidate.md`](../system/prompts/consolidate.md#generate-context). The hashes catch mistakes. They aren't a security control.
