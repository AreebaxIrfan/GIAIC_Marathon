# Day 02 — Loop Engineering Deep Dive: `/loop`, `/goal`, and the "Five-Tier Proposal" Scenario

> **Prerequisite:** Read `Day_01/README.md` first — it defines the System of Records, the MCP/Zia wire, and the High Concept ("a loop is a conversation that outlives a session"). Day 02 is where we make it run.

---

## 0. The Working Implementation (in this repo)

This repo ships a **runnable** version of the scenario — not just prose. The
files you can inspect right now:

| Path | What it is |
|---|---|
| `mcp-servers/zia-tutor/index.js` | The **Zia MCP server** — exposes `draft_proposal(tier, context)` implementing the five respectful tiers + father escalation. |
| `.claude/skills/proposal-writer.md` | The **skill** documenting the proposal contract, tier definitions, and cultural guardrails. |
| `loops/proposal-loop/proposal.json` | The **System of Records** (SoR) — single source of truth for tier/status/history. |
| `loops/proposal-loop/maker.js` | **Maker** agent — reads SoR, calls Zia via MCP, sends email, writes back. |
| `loops/proposal-loop/checker.js` | **Checker** agent — verifies Maker's work (Concept 11). |
| `loops/proposal-loop/watcher.js` | **Reply Watcher** — event-driven reply detection (Concept 7). |
| `loops/proposal-loop/run-loop.js` | Local test runner — Maker → Checker → Watcher in sequence. |
| `loops/proposal-loop/reply_log.jsonl` | Simulated replies (3 "no" + father scenario). |

To run locally: `npm run test:loop` (after `npm run install:all`).

---

## 1. What This Day Covers

| Theme | What you'll do |
|---|---|
| **`/loop` deep dive** | Move from Concept 4 (in-session) to Concept 6 (scheduled/unattended) — loops that survive a closed laptop. |
| **`/goal` deep dive** | Give the loop a *goal* instead of a fixed script; let the agent plan the steps. |
| **Real scenario practice** | Build a complete, scenario-driven loop: the **Five-Tier Marriage Proposal** (emails, retries, escalation to father). |
| **SoR + MCP in action** | Persist state to the System of Records; call the Zia tutor via MCP for phrasing/checking. |
| **Maker-Checker (Concept 11)** | One agent drafts, a different check verifies — no silent failures. |

---

## 2. `/loop` — From Kitchen Timer to Cron

| Concept | Scope | Lives while… | Use when |
|---|---|---|---|
| **4 — In-Session Loop** | `/loop 1m …` | Your terminal session is open | Quick wait-for-background-task (Project 1) |
| **6 — Unattended Schedule** | Routine / cron (`claude schedule …`) | The machine / cloud runner is up | Anything that must run *tomorrow at 8 AM* even if you're asleep |

**The migration path (what Day 02 practices):**

```bash
# Day 01 style — dies when you close the tab
/loop 1m check result.txt; if done, tell me and cancel

# Day 02 style — survives a reboot
# 1. Define the loop as a *Routine* (scheduled, unattended)
# 2. Give it a *goal* (not a fixed script)
# 3. Wire its memory to the SoR (git repo / JSON ledger)
# 4. Add a *checker* (Maker-Checker) so it can't lie to itself
```

---

## 3. `/goal` — Declarative Intent Over Imperative Script

`/goal` lets you say **what** you want, not **how** to get it. The agent plans the
steps, uses tools, and reports back when the goal is met (or failed).

```text
/goal "Send a marriage proposal email to Ayesha; retry up to 5 times with
       escalating sincerity; if all 5 fail, escalate to her father for
       permission to speak with him. Record every attempt in the SoR.
       Use Zia (MCP) to refine the wording each round."
```

The agent then:
1. Reads the SoR → "What tier are we on? What did she reply last time?"
2. Calls Zia (MCP) → "Draft a Tier-3 proposal email, warmer than Tier 2."
3. Sends the email (via connector / SMTP tool).
4. Waits for reply (polling or webhook — Concept 7).
5. On "yes" → **goal met, loop cancels itself.**
6. On "no" or silence → increment tier, persist to SoR, reschedule.
7. After Tier 5 "no" → escalate: draft father email, send, record, done.

---

## 4. The Scenario: Five-Tier Marriage Proposal Loop

> **Yes, this is intentionally absurd.** That's the point — a ridiculous domain
> forces you to *actually* use the architecture (SoR, tiers, escalation,
> Maker-Checker, MCP) instead of hand-waving. If it works here, it works on
> your real automation.

### 4.1 Tier Ladder (the "spine" of the loop)

| Tier | Trigger | Email Tone | MCP/Zia Role | SoR Entry |
|---|---|---|---|---|
| 1 | First send | Polite, formal introduction | "Draft a respectful first proposal" | `tier=1, sent=ISO8601, status=sent` |
| 2 | No reply 48h | Warm, personal, specific | "Add a shared memory / detail" | `tier=2, sent=…, status=sent` |
| 3 | No reply 48h | Vulnerable, honest | "Rewrite with emotional honesty" | `tier=3, sent=…, status=sent` |
| 4 | No reply 48h | Direct, clear intent | "Make the ask unmistakable" | `tier=4, sent=…, status=sent` |
| 5 | No reply 48h | Final, closure-worthy | "Final attempt — no pressure" | `tier=5, sent=…, status=sent` |
| **Escalation** | Tier 5 → "no" | Respectful request to father | "Draft letter to father asking permission to speak" | `tier=father, sent=…, status=sent` |

### 4.2 State Machine (what the SoR holds)

```json
{
  "proposal": {
    "target": "ayesha@example.com",
    "father": "father@example.com",
    "current_tier": 1,
    "max_tiers": 5,
    "status": "awaiting_reply",   // sent | awaiting_reply | yes | no | escalated
    "history": [
      { "tier": 1, "sent_at": "2026-08-20T08:00:00Z", "reply": null },
      { "tier": 2, "sent_at": "2026-08-22T08:00:00Z", "reply": "no" }
    ],
    "last_checked": "2026-08-24T08:00:00Z"
  }
}
```

**Rule:** The loop *never* decides "what tier am I on?" from memory. It **reads the
SoR**. If the SoR says `current_tier: 3`, the loop sends Tier 3 — even if the
agent "thinks" it already sent Tier 3 yesterday.

### 4.3 Maker-Checker Pair (Concept 11)

| Role | Prompt (simplified) |
|---|---|
| **Maker** | "Read SoR → call Zia (MCP) to draft Tier-N email → send → append to SoR." |
| **Checker** | "Read SoR → verify email was actually sent (SMTP log) → verify tier matches → verify Zia was called → flag any mismatch." |

The Checker runs *after* the Maker, on the same schedule. If Checker finds a
drift, it writes `status: "checker_failed"` to the SoR and alerts you — the
loop does **not** silently continue.

---

## 5. Architecture Diagram (Day 02 in One Picture)

```
┌─────────────────────────────────────────────────────────────────┐
│                        SCHEDULE (cron / Routine)                │
│                          every 24h                               │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     MAKER AGENT (wakes, runs)                   │
│  1. READ SoR (git repo / proposal.json)                         │
│  2. IF status==="yes"          → cancel loop, DONE              │
│  3. IF status==="no" & tier<5  → tier++                         │
│  4. IF status==="no" & tier=5  → escalate to father             │
│  5. CALL Zia via MCP: "draft Tier-N proposal email"             │
│  6. SEND email (SMTP connector)                                 │
│  7. WRITE SoR: append history, update tier, status="sent"       │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     CHECKER AGENT (runs after Maker)            │
│  1. READ SoR (same file)                                        │
│  2. VERIFY: email sent? tier correct? Zia called? no drift?     │
│  3. WRITE SoR: checker_ok=true | checker_failed + reason        │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                        REPLY WATCHER (Concept 7)                │
│   - IMAP poll / webhook → on "yes": write SoR status="yes"      │
│   - on "no":  write SoR status="no" (triggers next tier)        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Step-by-Step: Building It (in Your Throwaway or This Repo)

> **Option A — Use this repo (recommended):** The implementation is already
> here. See **Section 0** for the file map. Run `npm run test:loop` to see it
> work.
>
> **Option B — Build from scratch in a throwaway repo:** Follow the prompts
> below. The agents create/delete files and send real/simulated emails. Do not
> run in a repo you care about.

```bash
mkdir proposal-loop-practice
cd proposal-loop-practice
git init
claude
# Say "yes" to trust the folder
```

### 6.1 Create the SoR (proposal.json)

Ask Claude:
```
Create proposal.json with the initial state from Day 02 README (target,
father, current_tier: 1, max_tiers: 5, status: "awaiting_reply", empty
history). Commit it.
```

> **This repo's version:** `loops/proposal-loop/proposal.json`

### 6.2 Wire Zia as an MCP Server

```
Create a tiny MCP server (Node) called zia-tutor that exposes one
tool: draft_proposal(tier, context). Implement the five respectful tiers +
father escalation per the proposal-writer skill. Register it in
.claude/mcp_servers.json so Claude Code can call it.
```

> **This repo's version:** `mcp-servers/zia-tutor/index.js` + `.claude.json`

### 6.3 Define the Skill (Proposal Writer Contract)

```
Create .claude/skills/proposal-writer.md documenting the tier definitions,
cultural guardrails, and MCP tool contract for draft_proposal.
```

> **This repo's version:** `.claude/skills/proposal-writer.md`

### 6.4 The Maker Loop (as a `/goal`)

```
/goal "Read proposal.json. If status is 'yes', cancel this routine. If
status is 'no' and current_tier < 5, increment current_tier. If status is
'no' and current_tier == 5, set current_tier to 'father'. Call the
zia-tutor MCP tool draft_proposal with the tier and context from history.
Send the returned email to the target (or father) via SMTP. Append the
attempt to history with sent_at=now, status='sent'. Write proposal.json.
Commit."
```

Save this as a **Routine** (unattended, runs daily at 08:00):
```
claude schedule create --name proposal-maker --cron "0 8 * * *" --goal "<the goal above>"
```

### 6.4 The Checker Loop (runs 15 min after Maker)

```
/goal "Read proposal.json. Verify: (a) the latest history entry has a
sent_at within the last 30 min, (b) its tier matches current_tier, (c) an
MCP call to zia-tutor was logged (check .claude/mcp_logs), (d) SMTP log
shows a send to the right recipient. If all pass, write
checker_ok: true. If any fail, write checker_ok: false, checker_reason:
'...'. Commit."
```

```
claude schedule create --name proposal-checker --cron "15 8 * * *" --goal "<the goal above>"
```

### 6.5 The Reply Watcher (Concept 7 — event-driven)

```
/goal "Poll IMAP for replies from ayesha@example.com (or father@...). If a
reply contains 'yes' (case-insensitive), update proposal.json:
status='yes', cancel both routines. If a reply contains 'no', update
status='no' (maker will increment tier next run). Commit."
```

```
claude schedule create --name proposal-watcher --cron "*/30 * * * *" --goal "<the goal above>"
```

### 6.6 Verify the Loop Registered

```
show my running loops
# Should show: proposal-maker (daily 08:00), proposal-checker (daily 08:15),
# proposal-watcher (every 30 min)
```

---

## 7. Definition of Done (Day 02)

You have finished Day 02 when, **without manual intervention**:

- [ ] The **Maker** runs on schedule, reads the SoR, calls Zia (MCP), sends an
      email, and writes the result back to the SoR.
- [ ] The **Checker** runs after, verifies the Maker's work, and writes
      `checker_ok: true` (or a clear failure reason) to the SoR.
- [ ] The **Watcher** detects a simulated "yes" reply, writes `status: "yes"`
      to the SoR, and **cancels both routines automatically**.
- [ ] You can inspect `proposal.json` (the SoR) and see a complete, auditable
      history: tier 1 → tier 2 → … → tier 5 → father escalation → yes/no.
- [ ] You never typed a follow-up prompt after creating the three routines —
      the loops *ran themselves*.

---

## 8. What This Proves (The Day 01 High Concept, Made Real)

| Day 01 Claim | Day 02 Evidence |
|---|---|
| "A loop is a conversation that outlives a session" | Three routines run on cron; you closed the terminal; they kept going. |
| "The SoR is the spine" | `proposal.json` is the *only* place the loop reads tier/status from. |
| "MCP wires the tutor into the loop" | `zia-tutor` MCP tool is called automatically each tier — no human copy-paste. |
| "Maker-Checker prevents silent drift" | Checker catches a missed MCP call or mismatched tier and flags it. |
| "Escalation is just another tier" | Tier 5 → father is the same code path, just a different recipient. |

---

## 9. Cleanup (When You're Done)

```
cancel all my running loops
# or individually:
cancel the proposal-maker loop
cancel the proposal-checker loop
cancel the proposal-watcher loop
```

Then delete the throwaway repo or keep it as a reference for Day 03+.

---

## 10. Where To Go Next

- **Day 03** (coming) — add **observability** (Concept 13: cost tracking,
  Concept 14: failure modes, alerting, dashboards).
- **`../Loop_Engineering/03_Project_the_morning_brief_with_a_memory/`** — the
  source project for unattended schedules + memory (SoR).
- **`../Loop_Engineering/06_Project_the_doorbell_loop/`** — the source for
  event-driven reply watching (Concept 7).

---

*GIAIC Marathon · Day 02 — the loop runs, the tutor writes, the checker guards,
the SoR remembers. Day 03 makes it visible.*