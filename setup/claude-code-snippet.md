# Snippet for `~/.claude/CLAUDE.md`

Paste the block below at the end of `~/.claude/CLAUDE.md` (Claude Code's global instructions). Replace `/ABSOLUTE/PATH/TO/brain` with your repo path. The same text works in Claude Desktop's personal preferences, a Claude Project's instructions, and Codex's `~/.codex/AGENTS.md`.

```markdown
<!-- brain:start -->
# My personal AI brain

When a task needs personal context about me (background, preferences, goals, people, projects, history):

- First read `~/.local/share/ai-brain/published/bootstrap/context/map.md` and `~/.local/share/ai-brain/published/bootstrap/AGENTS.md`, and follow AGENTS.md's answer rules: cite record paths; confidence comes from the record, never from search scores; say "not in the brain" when nothing supports an answer. (Without file access, read them with the `brain` MCP server: `get brain-bootstrap/context/map.md` and `get brain-bootstrap/AGENTS.md`.)
- Search with the `brain` MCP server: `query`, then `get` the result before relying on it. Default search covers approved, current records only.
- Don't take facts from the working repo at /ABSOLUTE/PATH/TO/brain. It can hold unmerged edits and inbox proposals.
- When I say "brain: …" or ask you to remember something, follow `/ABSOLUTE/PATH/TO/brain/system/prompts/propose.md` to file a proposal. Never edit records directly. (Without file access, write one Markdown block instead: the target record, the proposed line ending in a claim marker such as `[confirmed YYYY-MM-DD · me:YYYY-MM-DD]`, the statement date, and my exact words as evidence. Then tell me to save it as `inbox/proposals/prop-YYYYMMDD-<slug>.md` or paste it into Claude Code.)
<!-- brain:end -->
```
