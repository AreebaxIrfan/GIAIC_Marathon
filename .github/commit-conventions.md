# Git Commit Conventions — GIAIC Marathon

This document defines the commit message format and workflow conventions for
this repository. Follow these for professional-grade history.

---

## Commit Message Format

We use **Conventional Commits** (Angular style) with minor adaptations:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types

| Type | When to use |
|---|---|
| `feat` | New feature for the user (new loop, new MCP tool, new skill) |
| `fix` | Bug fix (checker false positive, MCP parsing error) |
| `docs` | Documentation only (README, skill docs, code comments) |
| `style` | Formatting, whitespace, no logic change |
| `refactor` | Code restructuring without behavior change |
| `perf` | Performance improvement |
| `test` | Adding/updating tests |
| `chore` | Maintenance (deps, build config, CI, SoR updates from loops) |
| `revert` | Reverts a previous commit |

### Scopes (optional but recommended)

| Scope | Area |
|---|---|
| `day01` | Day 01 concepts / README |
| `day02` | Day 02 proposal loop |
| `mcp` | MCP server / Zia tutor |
| `skill` | `.claude/skills/` |
| `loop` | `loops/` agents (maker, checker, watcher) |
| `sor` | System of Records (proposal.json) |
| `ci` | GitHub Actions / CI config |
| `deps` | package.json / dependencies |

### Description Rules

- **Imperative mood**: "add" not "added" or "adds"
- **Lowercase first letter**: "add feature" not "Add feature"
- **No period at end**: "add feature" not "add feature."
- **Max 72 chars** (soft), 50 chars (ideal)
- **Reference issues**: `feat(day02): add father escalation tier (#12)`

### Body (optional)

- Explain **why**, not **what** (the diff shows what)
- Wrap at 72 chars
- Separate from header with blank line

### Footers (optional)

- `BREAKING CHANGE: <description>` for breaking changes
- `Refs: #123` or `Closes: #123` for issue links
- `Co-Authored-By: Name <email>` for pair work

---

## Examples

```
feat(day02): add five-tier proposal loop with maker/checker/watcher

Implements the full scenario: Maker calls Zia via MCP for each tier,
Checker verifies email sent + tier consistency + MCP call, Watcher
polls replies and updates SoR status. Includes father escalation tier.

Refs: #3
```

```
fix(mcp): handle fallback when Zia MCP server unavailable

Maker now catches MCP connection errors and uses a basic template
instead of crashing. Adds tone_notes marker for Checker to detect.

Closes: #7
```

```
docs(day01): add high concept section to README

Adds "A loop is a conversation that outlives a session" as the
unifying idea connecting SoR, MCP, and Loop Engineering.
```

```
chore(sor): update proposal.json after Tier 3 send

Auto-commit from Maker agent: tier=3, status=awaiting_reply,
history appended with sent_at=2026-08-22T08:00:00Z.
```

```
refactor(loop): extract email sending to shared module

Moves sendEmail() from maker.js to lib/email.js so Watcher can
reuse for notifications. No behavior change.
```

---

## Branch & PR Workflow

### Branches

- `main` — protected, deployable, only updated via PR
- Feature branches: `<type>/<short-desc>` e.g. `feat/day02-father-tier`, `fix/mcp-fallback`
- No direct pushes to `main`

### Pull Requests

- Title follows commit format: `feat(day02): add father escalation tier`
- Description includes: motivation, testing done, screenshots/logs if relevant
- At least 1 approval required (or self-merge with "chore" / "docs" only)
- Squash merge preferred (keeps `main` linear)

### Commit Hygiene

- **Atomic commits**: one logical change per commit
- **No WIP commits** in PR history — squash before merge
- **Sign commits**: `git commit -S` (GPG/SSH signing)
- **No force push** to shared branches

---

## Automated Enforcement

### `.github/workflows/commit-lint.yml`

```yaml
name: Commit Lint
on:
  push:
    branches: [main]
  pull_request:
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: wagoid/commitlint-github-action@v6
```

### Local Setup (Recommended)

```bash
# Install commitlint
npm install -D @commitlint/cli @commitlint/config-conventional

# Add to package.json
"commitlint": {
  "extends": ["@commitlint/config-conventional"],
  "rules": {
    "type-enum": [2, "always", ["feat", "fix", "docs", "style", "refactor", "perf", "test", "chore", "revert"]],
    "scope-case": [2, "always", "lower-case"],
    "subject-case": [2, "always", "sentence-case"],
    "subject-empty": [2, "never"],
    "header-max-length": [2, "always", 72]
  }
}

# Husky pre-commit hook
npx husky add .husky/commit-msg 'npx --no -- commitlint --edit "$1"'
```

---

## Changelog Generation

Use `conventional-changelog` or GitHub's auto-generated release notes.
Tag releases as `v<major>.<minor>.<patch>` (e.g., `v1.0.0`).

---

## Day-Specific Guidelines

### Day 01 (Concepts)
- Type: `docs(day01)`
- Scope: `day01`
- No code changes expected

### Day 02 (Proposal Loop)
- Implementation: `feat(day02)`, `feat(mcp)`, `feat(skill)`, `feat(loop)`
- SoR auto-commits: `chore(sor)`
- Bug fixes: `fix(day02)`, `fix(mcp)`, `fix(loop)`

### Future Days
- Follow same pattern: `feat(dayXX)`, `fix(dayXX)`, etc.

---

## Quick Reference Card

```
feat(day02): add checker verification for MCP call
fix(mcp): handle timeout in draft_proposal tool
docs(day01): clarify high concept paragraph
refactor(loop): share email logic between maker/watcher
chore(sor): auto-commit Tier 4 proposal send
test(day02): add integration test for full loop cycle
```

**When in doubt**: `feat` for new behavior, `fix` for broken behavior, `docs` for text, `chore` for maintenance.