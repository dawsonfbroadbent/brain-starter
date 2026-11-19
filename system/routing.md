# Routing

Where each fact lives, and the format every record follows. **Every fact has one home.** Other records link to that home instead of repeating the fact. Agent rules (approval, inbox, sensitivity) are in [`AGENTS.md`](../AGENTS.md).

> Examples in this file are hypothetical. They illustrate placement only and are never facts about the owner.

## 1. Folder purposes

| Folder / file | Home for | Not for |
|---|---|---|
| `context/` | Nothing. Generated summaries agents load first | Any edit by hand |
| `profile/identity.md` | Name, self-description, rough location, background, languages | Goals, preferences |
| `profile/values-and-boundaries.md` | Values and hard limits | Domain preferences (food, fitness) |
| `profile/working-style.md` | How you plan, collaborate, communicate, decide | How you learn; how agents behave |
| `profile/ai-preferences.md` | Standing rules for how AI agents work with you | Reusable prompt text (→ `writing/ai-prompts.md`) |
| `goals/current-priorities.md` | What you're focused on now, with a horizon | Durable traits; task lists |
| `goals/long-term.md` | Multi-year objectives with target dates | Current focus |
| `writing/principles.md` | Voice and style rules for all writing | Channel-specific rules |
| `writing/<channel>.md` | Rules for one channel (email, LinkedIn, ...) | General rules |
| `writing/examples/` | Approved samples of your writing | Rules |
| `education/overview.md` | One line per degree or program | Program or course detail |
| `education/courses/` | One record per course | Reusable knowledge (→ `knowledge/`) |
| `work/experience.md` | One line per role, linking to `work/roles/` | Role detail |
| `work/roles/` | One record per job someone else employs you in | Businesses you own |
| `work/career-direction.md` | Target roles and industries, and why | Dated objectives (→ `goals/`) |
| `ventures/` | One record per business you own or co-founded | Employment; bounded deliverables |
| `projects/` | One record per bounded piece of work | Code; task lists |
| `crm/people/` | One record per person: current relationship summary | Meeting notes (→ `crm/interactions/`) |
| `crm/companies/` | One record per outside organization | Your own ventures |
| `crm/interactions/` | One record per meaningful interaction | Ongoing relationship summary |
| `crm/opportunities/` | One record per open possibility (job, deal, partnership) | Committed work |
| `life/` | Personal life: fitness, food, interests, outdoors, family, style | Sensitive details about others |
| `knowledge/` | Reusable knowledge and frameworks | Your preferences; one-off notes |
| `history/decisions/` | Significant decisions: context, options, choice, date | The current state it produced |
| `history/lessons/` | Lessons from your own experience, dated | General frameworks |
| `history/changes/` | Statements that were replaced | Anything still true |
| `archive/` | Whole records that are no longer active | Replaced statements (→ `history/changes/`) |
| `inbox/` | Nothing. Unapproved proposals and captures | Any fact |
| `system/` | How the brain works | Facts about you |

## 2. Deciding between two homes

- **profile ↔ goals:** has a target or a "by when"? Goal. Describes who you are? Profile.
- **roles ↔ ventures ↔ projects:** someone else employs you → `work/roles/`. You own an ongoing business → `ventures/`. A deliverable with an end → `projects/`, linking to the venture, role, or course it was done under.
- **people ↔ interactions:** "Jane is a PM at Acme" → `crm/people/person-jane-doe.md`. "Coffee with Jane on 2026-10-14" → `crm/interactions/int-20261014-jane-doe-coffee.md`, linking to the person. When Jane changes jobs, update the person record and move the old employer to `history/changes/`. Interactions are events and are never superseded.
- **opportunities ↔ projects:** a possible deal is an opportunity. When it's won, create the project (or venture, or role), set the opportunity to `status: archived` with an outcome line, and move it to `archive/crm/opportunities/`.
- **lessons ↔ knowledge:** tied to something that happened to you, with a date → `history/lessons/`. General and undated → `knowledge/`. When unsure, write the lesson and link it to the framework.
- **decisions ↔ changes ↔ archive:** why you chose something → `history/decisions/`. A statement that used to be true → `history/changes/`. A whole record that's inactive → `archive/`.
- **context/now ↔ goals/current-priorities:** facts go in `goals/`. `context/now.md` is regenerated from it.

## 3. Record format

Every record in a content folder (`profile goals writing education work ventures projects crm life knowledge history archive`) and in `inbox/` starts with YAML frontmatter. READMEs and `system/` docs have none.

```yaml
---
id: person-jane-doe        # required for the ID types below; equals the file name without .md
type: person               # see allowed types
status: current            # unpopulated | draft | current | superseded | archived
updated: 2026-10-21        # last content change (YYYY-MM-DD)
verified: null             # date the owner explicitly confirmed the whole record, or null
review_by: 2027-01-19      # optional: when to re-check a record that goes stale
sources:                   # where the content came from; [] when none
  - ref: me:2026-10-21     # you said it, on that date
  - ref: email:<message-id>
    url: https://...
    as_of: 2026-10-20      # date of the source statement, not the import date
---
```

**Allowed `type`:** `profile` · `preference` · `goal` · `role` · `venture` · `project` · `person` · `company` · `interaction` · `opportunity` · `knowledge` · `decision` · `lesson` · `change` · `context` · `capture` · `proposal`

**`status` lifecycle**

| Status | Meaning | Searchable |
|---|---|---|
| `unpopulated` | Empty scaffold | No |
| `draft` | Being written | No |
| `current` | Holds only current statements | Yes, by default |
| `superseded` | Replaced | Only when an agent opts in (`brain-history`) |
| `archived` | No longer active | Only when an agent opts in (`brain-archive`) |

**Approval isn't a status.** A record is approved when it's on `main`, and only you merge to `main`.

**`verified`** is set only when you explicitly confirm the record's content, to that date. Editing, importing, or consolidating never sets it. If the content changes later, it resets to `null` unless you confirm again.

**`review_by`** goes on records that go stale. Suggested intervals from the last review: current priorities at the end of the horizon, opportunities 30 days, projects 60, people 90. `check.mjs` warns when one is overdue.

**`sources` refs:** `me:<YYYY-MM-DD>` for something you said, `email:<id>`, `cal:<id>`, `notes:<id>`, `repo:<owner>/<name>@<path>`, `prop:<prop-id>`. Pick a scheme and stay consistent.

### ID formats

| Type | Format | Example |
|---|---|---|
| person | `person-<first>-<last>` | `person-jane-doe` |
| company | `co-<slug>` | `co-acme` |
| interaction | `int-YYYYMMDD-<slug>` | `int-20261014-jane-doe-coffee` |
| opportunity | `opp-<slug>` | `opp-acme-pilot` |
| role | `role-<org>-<title>` | `role-acme-designer` |
| venture | `venture-<slug>` | `venture-studio` |
| project | `proj-<slug>` | `proj-booking-site` |
| decision | `dec-YYYYMMDD-<slug>` | `dec-20260801-pick-database` |
| lesson | `lesson-<slug>` | `lesson-fix-scope-first` |
| change | `chg-YYYYMMDD-<slug>` | `chg-20261101-jane-doe-employer` |
| proposal | `prop-YYYYMMDD-<slug>` | `prop-20261021-jane-new-employer` |

IDs never change, even when a name does. Slugs are lowercase letters, digits, and hyphens. Fixed-name files (`profile/identity.md` and the like) don't need an `id`.

### Claim markers

Every factual line ends with a marker saying what kind of claim it is:

| Marker | Meaning | Example |
|---|---|---|
| `[confirmed YYYY-MM-DD]` | You said it, or a primary source says it | `Works at Acme. [confirmed 2026-09-02]` |
| `[tentative YYYY-MM-DD]` | A plan or intention that may change | `Plans to apply to a program. [tentative 2026-10]` |
| `[inferred]` | The agent's reasoning; you never said it | `Likely prefers tool X. [inferred]` |
| `[historical FROM..TO]` | True for a past period | `Intern at Acme. [historical 2025-05..2025-08]` |

- Dates can be `YYYY`, `YYYY-MM`, or `YYYY-MM-DD`; use `?` when unknown (`[confirmed ?]`).
- A marker can cite a source: `[confirmed 2026-03-14 · me:2026-03-14]`.
- `confirmed` describes the source, not `verified`: a line can be confirmed while the record's `verified` is still `null`.
- A statement that used to be current and was replaced isn't marked `historical` in place. It moves to `history/changes/`.

## 4. Creating records

- Copy the template from `system/templates/`, replace every `<placeholder>`, and delete sections you don't use.
- Create a person, company, project, role, venture, interaction, or opportunity record only when there's evidence. Never to hold a guess.
- Link the new record from its parent summary (a new role from `work/experience.md`, for example).
- Add new folders when you need them, and add a row to the table above when you do.
