# system/

How the brain works. No facts about you live here.

| Path | What it is |
|---|---|
| `routing.md` | Where each kind of fact lives, the frontmatter schema, and claim markers |
| `prompts/propose.md` | How an AI turns something you said into a proposal |
| `prompts/consolidate.md` | How proposals become record changes and a pull request, and how `context/` is generated |
| `templates/` | One template per record type. Copy, fill in, delete unused sections |
| `scripts/check.mjs` | Validator: frontmatter, IDs, links, context freshness. `--stamp` writes context hashes |
| `scripts/publish.sh` | Copies approved records from `main` into the published folder and reindexes search |
| `scripts/mcp-serial.mjs` | Small stdio wrapper that avoids a QMD hang when an agent sends parallel requests |
| `scripts/hooks/pre-commit` | Local guardrail: blocks commits on `main` and secret-looking files |
