# Day 01 — Overview, System of Records, and Connecting the Claude Zia AI Tutor via MCP

This is the opening day of the **GIAIC Marathon** track on automation with Claude Code.
Day 01 is deliberately conceptual: before we build anything, we agree on the
vocabulary, the mental model, and the architecture that every later day rests on.

> **Companion day:** `Day_02/` continues from here — it takes the pieces named
> on this page and turns them into a working, unattended loop. Read this page
> first; Day 02 is where the hands hit the keyboard.

---

## 1. What This Day Covers

| Theme | Why it matters |
|---|---|
| **The overview** | A single map of what "automating with Claude Code" actually means before we dive into any one tool. |
| **System of Records (SoR)** | The canonical source of truth your loops read from and write to. Without it, loops are guessing. |
| **Claude Zia AI Tutor + MCP** | How the tutor's knowledge and tools become callable from inside an agent loop. |
| **Loop Engineering** | The discipline of building reliable, observable, unattended automation loops (from the `Loop_Engineering` project series). |
| **The High Concept** | The one idea that makes the other four cohere: *loops are conversations that outlive a session.* |

---

## 2. The Overview — What We Are Actually Building

"Automation with Claude Code" is not one thing. It is three layers stacked on top
of each other:

1. **The agent** — Claude Code, which can read files, run commands, call tools,
   and reason about what to do next.
2. **The loop** — a schedule or trigger that wakes the agent repeatedly, so the
   agent is no longer a one-shot prompt but a process that *keeps going*.
3. **The system around it** — a source of truth it trusts, and a way to talk to
   the outside world (people, other tools, the tutor) without a human in the
   middle every time.

Day 01 is about layers 2 and 3. The agent itself you already know. What we add
today is: *where does it get its facts, how does it stay honest, and how does it
reach beyond this terminal.*

---

## 3. System of Records (SoR)

### What it is

A **System of Records** is the single authoritative place that owns a piece of
state. If the agent needs to know "what did we already do?", "what is the current
status of task X?", or "has the user been notified yet?", the answer must come
from *one* place — not from memory, not from a guess, not from a scattered set of
files that might disagree.

For loop engineering, the SoR is usually something durable and inspectable:

- a **git repository** (the commit log *is* the record of what changed),
- a small **flat file or JSON ledger** the loop appends to,
- or a **database table** treated as the only source of truth.

### Why loops need it

An unattended loop can fail, restart, or run on a different machine than it did
yesterday. The moment the loop's "memory" lives only inside the agent's context,
it is gone the next time the process starts. The SoR is what survives:

- **survives a crash** — state is on disk / in the repo, not in RAM,
- **survives a session** — Concept 4 (in-session loop) dies when you close the
  terminal; the SoR is what lets a *scheduled* loop (Concept 6) pick up exactly
  where it left off,
- **is auditable** — anyone can open the record and see what the loop did and
  when, which is the whole point of Concept 14 (failure handling) and
  observability.

### The rule to remember

> **Read from the SoR. Write to the SoR. Never trust the loop's own memory for
> anything that must survive.**

If a loop says "I already did that," the SoR — not the loop — gets the final word.

---

## 4. Connecting the Claude Zia AI Tutor via MCP

### Who Zia is, in this context

The **Claude Zia AI Tutor** is the teaching assistant for this GIAIC track — the
entity that holds the course material, explains concepts, and can check your
work. In earlier days it lived *outside* the loop: you asked Zia a question, you
read the answer, you acted on it yourself.

Day 01 introduces the upgrade: **put Zia inside the loop.**

### What MCP is

**MCP (Model Context Protocol)** is the standard that lets Claude Code talk to
external systems as if they were built-in tools. An MCP server exposes:

- **tools** — actions the agent can call (e.g. "ask the tutor a question",
  "fetch the lesson for today"),
- **resources** — readable content the agent can pull in (e.g. the course
  syllabus, a lesson's text),
- **prompts** — reusable prompt templates.

By wrapping the Zia tutor as an MCP server, the agent stops treating Zia as a
human you message and starts treating Zia as a *capability it can call*.

### The connection, concretely

```
        ┌─────────────────────────────┐
        │   Claude Code (the agent)    │
        │                              │
        │   loop / schedule wakes it   │
        │        │                     │
        │        ▼  (MCP tool call)    │
        └────────┬────────────────────┘
                 │  MCP (Model Context Protocol)
                 ▼
        ┌─────────────────────────────┐
        │   Zia AI Tutor (MCP server)  │
        │   • lessons / syllabus       │
        │   • concept explanations     │
        │   • work-checking            │
        └─────────────────────────────┘
                 │
                 ▼
        ┌─────────────────────────────┐
        │   System of Records (SoR)    │
        │   • what's been learned       │
        │   • what's been checked       │
        └─────────────────────────────┘
```

The loop now can, on its own schedule:

1. pull today's lesson from Zia over MCP,
2. act on it,
3. record progress in the SoR,
4. and even ask Zia to *verify* the work — no human needed to ferry messages
   back and forth.

This is the difference between "a tutor I chat with" and "a tutor wired into my
automation." MCP is the wire.

---

## 5. Loop Engineering — The Discipline

This track borrows its bones from the `Loop_Engineering` project series (twelve
progressive projects in the sister repo). The concepts that matter for Day 01:

| Concept | Name | One-line meaning |
|---|---|---|
| 4 | **In-Session Loop** | A timer that fires *while your session is open* and dies when you close it. |
| 5 | **Conditional Loop** | Keep going *until* a condition is true, then stop (test-then-stop). |
| 6 | **Unattended Schedule** | A Routine / cron that runs even when your laptop is closed. |
| 7 | **Event-Driven Loop** | Fires on an external event (a doorbell), not a timer. |
| 11 | **Maker-Checker** | One agent does the work, a *different* check confirms it. |
| 12 | **The Spine** | The durable core (the SoR + the schedule) that a loop is built around. |
| 14 | **Failure** | What the loop does when something breaks — and how it reports it. |

The spine (Concept 12) is exactly the SoR from Section 3 plus a schedule. Loop
engineering, in one sentence: **build loops with a spine, a checker, and a known
failure mode.**

---

## 6. The High Concept

Here is the idea that makes everything above one thing instead of four:

> **A loop is a conversation that outlives a session.**

A single prompt is a conversation that ends when you stop typing. A *loop* is the
same conversation, scheduled to resume — and because it resumes without you, it
needs three supports that a one-off prompt does not:

1. **A spine** (the SoR) so it remembers between wake-ups.
2. **A wire to the world** (MCP, e.g. Zia) so it can reach knowledge and tools
   beyond this terminal.
3. **A discipline** (loop engineering) so it stays honest, observable, and
   recoverable when it breaks.

That is the whole arc of Day 01. Day 02 is where we build the first loop that
proves it.

---

## 7. Definition of Done (for Day 01)

You have finished Day 01 when you can, without looking it up:

- [ ] Explain what a **System of Records** is and name one you'd use for a loop.
- [ ] Draw, from memory, the **MCP connection** between Claude Code, the Zia
      tutor, and the SoR.
- [ ] State the **High Concept** in your own words.
- [ ] Name at least three **Loop Engineering concepts** (4, 6, 11, 12, 14…) and
      what each protects against.
- [ ] Tell someone why an in-session loop (Concept 4) is the *wrong* tool for
      anything that must survive a closed laptop.

---

## 8. Where To Go Next

- **`Day_02/`** — build the first working loop: wire Zia in over MCP, read from
  and write to the SoR, and let a schedule (not you) drive it.
- **`../Loop_Engineering/`** — the twelve-project source of the concepts cited
  here; Projects 1–3 map directly onto what Day 02 asks you to do.

---

*GIAIC Marathon · Day 01 — concepts before code. Day 02 is where it runs.*
