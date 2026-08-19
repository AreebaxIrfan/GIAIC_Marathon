---
name: proposal-writer
description: Write respectful, tiered marriage proposal emails for the five-tier scenario with MCP/Zia integration
---

# Proposal Writer Skill

This skill generates respectful, culturally appropriate marriage proposal emails for the **Five-Tier Proposal Loop** scenario (Day 02). It is designed to be called via MCP by the Maker agent.

## Invocation

The skill exposes one tool: `draft_proposal(tier, context)`.

### Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `tier` | integer / string | yes | 1–5, or `"father"` for escalation |
| `context` | object | yes | `{ "target_name": string, "sender_name": string, "shared_memories": string[], "previous_replies": string[], "cultural_notes": string }` |

### Returns

```json
{
  "subject": "string",
  "body": "string",
  "tone_notes": "string"
}
```

## Tier Definitions (Respectful & Culturally Grounded)

### Tier 1 — Introduction & Respectful Intent
**Tone:** Formal, courteous, clear about purpose, no pressure.
**Key elements:** Proper introduction, family reference, clear statement of intent, invitation for dialogue, explicit "no pressure" closing.

### Tier 2 — Personal Connection
**Tone:** Warm, specific, references a shared value or memory (from context).
**Key elements:** Acknowledges Tier 1, adds personal detail, shows genuine interest in her as a person.

### Tier 3 — Vulnerability & Honesty
**Tone:** Sincere, open, emotionally honest without being heavy.
**Key elements:** Shares why this matters personally, acknowledges her autonomy.

### Tier 4 — Clear & Direct
**Tone:** Unambiguous, respectful, makes the ask unmistakable.
**Key elements:** Direct proposal question, clear next steps if yes, graceful exit if no.

### Tier 5 — Final & Closure-Worthy
**Tone:** Respectful final attempt, no guilt, leaves door open for friendship.
**Key elements:** "This is my last message on this," gratitude for her time, well-wishes.

### Father Escalation — Permission to Speak
**Tone:** Deeply respectful, traditional, seeks blessing for a conversation (not the marriage itself).
**Key elements:** Addresses father properly, states intent transparently, asks for permission to speak with his daughter, acknowledges his role.

## Cultural & Respect Guardrails

- **Never** persist after a clear "no" beyond Tier 5.
- **Never** use guilt, pressure, or emotional manipulation.
- **Always** include an explicit "you are free to say no / not reply" line.
- **Always** use proper honorifics (context.cultural_notes guides this).
- **Father escalation** is *only* for permission to speak — not to bypass her decision.

## Example Usage (MCP Tool Call)

```json
{
  "tier": 2,
  "context": {
    "target_name": "Ayesha",
    "sender_name": "Ahmed",
    "shared_memories": ["studied together at GIAIC", "both love Quranic Arabic"],
    "previous_replies": ["Thank you for your message. I need time."],
    "cultural_notes": "South Asian Muslim family; use 'beta/baaji' conventions; involve family respectfully"
  }
}
```

## Implementation Notes (for the MCP Server)

The actual MCP server (`zia-tutor`) implements this skill. The skill file here documents the **contract** — what the Maker agent expects when it calls `draft_proposal`. The server can use an LLM, templates, or a hybrid; the output must conform to the return schema above and respect the guardrails.