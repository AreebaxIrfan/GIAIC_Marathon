#!/usr/bin/env node
/**
 * Zia AI Tutor MCP Server
 * Provides the `draft_proposal` tool for the Five-Tier Marriage Proposal Loop.
 * Implements the proposal-writer skill contract.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const server = new Server(
  {
    name: "zia-tutor",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// ============================================================
// TIER TEMPLATES — Respectful, Culturally Grounded
// ============================================================

const TIER_TEMPLATES = {
  1: {
    subject: "A Respectful Introduction — From {sender_name}",
    body: `Assalamu alaikum {target_name},

I hope this message finds you well. My name is {sender_name}, and I am writing to you with sincere respect and clear intent.

I have come to know of you through {context_note}, and I feel compelled to reach out in a manner that honors both our families and our faith. My intention is straightforward: I am seeking a righteous spouse with whom I can build a home rooted in Islam, mutual respect, and shared purpose.

I understand that a proposal of this nature deserves time, thought, and family consultation. There is absolutely no expectation of an immediate response, and you are entirely free to decline or not reply at all — your comfort and autonomy are paramount.

If you or your family would like to know more about me, my background, or my intentions, I would be honored to share further. Please feel free to have a trusted family member contact me at any time.

May Allah guide us both to what is best.

With respect and dua,
{sender_name}
{contact_info}`,
    tone_notes: "Formal, courteous, clear intent, no pressure, explicit autonomy statement"
  },

  2: {
    subject: "Following Up — A Personal Note from {sender_name}",
    body: `Assalamu alaikum {target_name},

Thank you for taking the time to read my previous message. I appreciate your consideration, and I wanted to write again with something more personal.

{shared_memory_note}

It is rare to find someone who shares {shared_value}, and that resonance is part of why I felt moved to reach out. Beyond any "on paper" compatibility, I genuinely value the person you are — your character, your priorities, the way you carry yourself.

Please know that my first message stands: there is no pressure, no timeline you must adhere to, and no offense taken if this is not the path for you. I simply wanted you to know that my interest is sincere and specific, not generic.

I leave this entirely in your hands, and in Allah's.

Warmly,
{sender_name}
{contact_info}`,
    tone_notes: "Warm, specific, references shared memory/value, reinforces no pressure"
  },

  3: {
    subject: "Speaking From the Heart — {sender_name}",
    body: `Assalamu alaikum {target_name},

I have hesitated to write this, because vulnerability is not easy. But sincerity demands it.

The reason I have persisted — respectfully, I hope — is not because I expect persistence to change your answer. It is because the prospect of building a life with you matters to me deeply, and I would regret not being fully honest about that.

I do not say this to make you feel obligated. Quite the opposite: I say it so that if your answer is no, you know it was heard by someone who meant every word. And if your answer is yes, you know exactly what you are saying yes to — someone who takes this responsibility seriously.

Your time, your heart, your decision — all of it deserves respect. I honor whatever you choose.

For the sake of Allah,
{sender_name}
{contact_info}`,
    tone_notes: "Sincere, vulnerable, honest, explicitly non-coercive"
  },

  4: {
    subject: "A Clear Ask — {sender_name}",
    body: `Assalamu alaikum {target_name},

I want to be unambiguous, because clarity is its own form of respect.

I am asking for your hand in marriage, with the intention of a nikah that pleases Allah, built on love, mercy, and partnership. I am ready for the responsibilities that come with that — to provide, to protect, to listen, to grow alongside you.

If your answer is yes, the next step would be for our families to meet (or for a trusted representative to coordinate) at a time and place of your choosing. I am flexible and will follow whatever process your family prefers.

If your answer is no, I accept it completely, with gratitude for your time and dua for your happiness. No further messages will follow on this matter.

The decision is yours, and I respect it fully.

{sender_name}
{contact_info}`,
    tone_notes: "Direct, clear proposal question, defined next steps, graceful exit"
  },

  5: {
    subject: "Final Message — With Gratitude and Dua",
    body: `Assalamu alaikum {target_name},

This is the last message I will send on this matter.

I have written four times before this. Each time, I hoped — but I also prepared myself for any answer. Today, I am writing not because I expect a different outcome, but because I owe it to my own sincerity to make one final, clear expression of what you mean to me.

You are someone of rare character. If Allah has written us together, I will spend my life honoring that. If He has not, I pray He blesses you with a spouse who sees you the way I do — and with every happiness in this world and the next.

Thank you for reading my words. Thank you for your time. Thank you for being you.

I make dua for you, always.

{sender_name}
{contact_info}`,
    tone_notes: "Final, closure-worthy, grateful, no guilt, well-wishes"
  },

  father: {
    subject: "Request for Permission to Speak — From {sender_name}",
    body: `Assalamu alaikum respected Uncle {father_name},

I am writing to you with the utmost respect. My name is {sender_name}, son of {sender_father_name}, from {sender_family_background}.

I have come to know your daughter, {target_name}, and after careful consideration and istikhara, I would like to formally ask for your permission to speak with her about the possibility of marriage. My intention is sincere: I seek a righteous partner to build a home grounded in Islam, and I believe your daughter possesses the character and values that would make that home beautiful.

I understand the weight of this request. I am not asking for her hand today — only for the honor of a respectful conversation, with your knowledge and blessing, so that both families can assess compatibility in the proper manner.

Whatever your decision, I will accept it with grace and gratitude. Your role as her guardian is one I deeply respect.

May Allah guide us all to what is best.

With deep respect,
{sender_name}
{contact_info}`,
    tone_notes: "Deeply respectful, traditional, asks permission to speak (not marriage), acknowledges father's role"
  }
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function fillTemplate(template, context) {
  const {
    target_name = "Ayesha",
    sender_name = "Ahmed",
    sender_father_name = "Hassan",
    sender_family_background = "a respected family",
    father_name = "",
    shared_memories = [],
    previous_replies = [],
    cultural_notes = "",
    contact_info = "Phone: +92-XXX-XXXXXXX | Email: ahmed@example.com"
  } = context;

  let shared_memory_note = "";
  let shared_value = "similar values";

  if (shared_memories.length > 0) {
    const memory = shared_memories[0];
    shared_memory_note = `I remember ${memory}. `;
    shared_value = "that perspective";
  }

  let context_note = "mutual acquaintances";
  if (shared_memories.length > 0) {
    context_note = `our shared connection (${shared_memories[0]})`;
  }

  let previous_reply_note = "";
  if (previous_replies.length > 0) {
    previous_reply_note = `You previously wrote: "${previous_replies[previous_replies.length - 1]}" I appreciate your honesty. `;
  }

  return template
    .replace(/{target_name}/g, target_name)
    .replace(/{sender_name}/g, sender_name)
    .replace(/{sender_father_name}/g, sender_father_name)
    .replace(/{sender_family_background}/g, sender_family_background)
    .replace(/{father_name}/g, father_name)
    .replace(/{shared_memory_note}/g, shared_memory_note)
    .replace(/{shared_value}/g, shared_value)
    .replace(/{context_note}/g, context_note)
    .replace(/{previous_reply_note}/g, previous_reply_note)
    .replace(/{contact_info}/g, contact_info);
}

// ============================================================
// MCP TOOL HANDLERS
// ============================================================

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "draft_proposal",
        description: "Draft a respectful marriage proposal email for the specified tier",
        inputSchema: {
          type: "object",
          properties: {
            tier: {
              type: ["integer", "string"],
              description: "Tier number (1-5) or 'father' for escalation",
              enum: [1, 2, 3, 4, 5, "father"]
            },
            context: {
              type: "object",
              description: "Context for personalizing the proposal",
              properties: {
                target_name: { type: "string" },
                sender_name: { type: "string" },
                sender_father_name: { type: "string" },
                sender_family_background: { type: "string" },
                father_name: { type: "string" },
                shared_memories: { type: "array", items: { type: "string" } },
                previous_replies: { type: "array", items: { type: "string" } },
                cultural_notes: { type: "string" },
                contact_info: { type: "string" }
              },
              required: ["target_name", "sender_name"]
            }
          },
          required: ["tier", "context"]
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name !== "draft_proposal") {
    throw new Error(`Unknown tool: ${name}`);
  }

  const { tier, context } = args;

  // Validate tier
  const validTiers = [1, 2, 3, 4, 5, "father"];
  if (!validTiers.includes(tier)) {
    throw new Error(`Invalid tier: ${tier}. Must be 1-5 or 'father'`);
  }

  // Get template
  const template = TIER_TEMPLATES[tier];
  if (!template) {
    throw new Error(`No template for tier: ${tier}`);
  }

  // Fill template with context
  const filled = fillTemplate(template, context);

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          subject: filled.subject,
          body: filled.body,
          tone_notes: template.tone_notes
        }, null, 2)
      }
    ]
  };
});

// ============================================================
// START SERVER
// ============================================================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Zia Tutor MCP server running on stdio");
}

main().catch((err) => {
  console.error("Server error:", err);
  process.exit(1);
});