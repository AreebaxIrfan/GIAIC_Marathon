#!/usr/bin/env node
/**
 * Maker Agent — Five-Tier Proposal Loop
 * Reads SoR, calls Zia (MCP), sends email, writes back to SoR.
 * Run as a scheduled routine (Concept 6).
 */

import fs from "fs";
import path from "path";
import { spawn } from "child_process";

const SOR_PATH = path.resolve("proposal.json");
const MCP_SERVER = path.resolve("../../mcp-servers/zia-tutor/index.js");

// ============================================================
// HELPERS
// ============================================================

function readSoR() {
  const raw = fs.readFileSync(SOR_PATH, "utf-8");
  return JSON.parse(raw);
}

function writeSoR(data) {
  fs.writeFileSync(SOR_PATH, JSON.stringify(data, null, 2));
  // Auto-commit for audit trail
  spawnSync("git", ["add", "proposal.json"], { cwd: path.dirname(SOR_PATH) });
  spawnSync("git", ["commit", "-m", `chore: update SoR — tier ${data.proposal.current_tier}, status ${data.proposal.status}`], { cwd: path.dirname(SOR_PATH) });
}

function spawnSync(cmd, args, opts = {}) {
  return new Promise((resolve) => {
    const p = spawn(cmd, args, { ...opts, shell: true, stdio: "pipe" });
    let out = "", err = "";
    p.stdout.on("data", d => out += d);
    p.stderr.on("data", d => err += d);
    p.on("close", code => resolve({ code, out, err }));
  });
}

async function callMCP(tier, context) {
  // Call the MCP server via stdio
  return new Promise((resolve, reject) => {
    const mcp = spawn("node", [MCP_SERVER], {
      stdio: ["pipe", "pipe", "pipe"]
    });

    let stdout = "", stderr = "";

    mcp.stdout.on("data", d => stdout += d);
    mcp.stderr.on("data", d => stderr += d);

    mcp.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`MCP server exited with code ${code}: ${stderr}`));
        return;
      }
      try {
        // The MCP response is JSON-RPC; parse the last line which contains the result
        const lines = stdout.trim().split("\n");
        const lastLine = lines[lines.length - 1];
        const parsed = JSON.parse(lastLine);
        if (parsed.result && parsed.result.content) {
          const content = JSON.parse(parsed.result.content[0].text);
          resolve(content);
        } else {
          reject(new Error("Unexpected MCP response format"));
        }
      } catch (e) {
        reject(new Error(`Failed to parse MCP response: ${e.message}\nRaw: ${stdout}`));
      }
    });

    // Send the tool call request
    const request = {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        name: "draft_proposal",
        arguments: { tier, context }
      }
    };
    mcp.stdin.write(JSON.stringify(request) + "\n");
    mcp.stdin.end();
  });
}

async function sendEmail(to, subject, body) {
  // SIMULATED: In production, use nodemailer or an SMTP connector
  console.log(`\n📧 SIMULATED EMAIL SENT`);
  console.log(`   To: ${to}`);
  console.log(`   Subject: ${subject}`);
  console.log(`   Body:\n${body}\n`);

  // Log to a file for the Checker to verify
  const logEntry = {
    timestamp: new Date().toISOString(),
    to,
    subject,
    body,
    status: "sent"
  };
  fs.appendFileSync("email_log.jsonl", JSON.stringify(logEntry) + "\n");

  return { success: true, messageId: `sim-${Date.now()}` };
}

// ============================================================
// MAIN MAKER LOGIC
// ============================================================

async function main() {
  console.log("🔄 Maker: Starting run...");

  const sor = readSoR();
  const p = sor.proposal;

  // Check terminal states
  if (p.status === "yes") {
    console.log("✅ Proposal accepted! Status is 'yes'. Cancelling routines.");
    // In real Claude Code, the routine would self-cancel via /cancel
    return;
  }

  // Determine tier and recipient
  let tier = p.current_tier;
  let recipient = p.target;
  let recipientName = p.target_name;
  let isFather = false;

  if (p.status === "no") {
    if (p.current_tier < p.max_tiers) {
      tier = p.current_tier + 1;
      p.current_tier = tier;
    } else {
      // Escalate to father
      tier = "father";
      p.current_tier = "father";
      recipient = p.father;
      recipientName = p.father_name;
      isFather = true;
    }
  }

  // Prepare context for Zia
  const context = {
    target_name: recipientName,
    sender_name: p.sender_name,
    sender_father_name: p.sender_father_name,
    sender_family_background: p.sender_family_background,
    father_name: p.father_name,
    shared_memories: p.shared_memories,
    previous_replies: p.history.map(h => h.reply).filter(Boolean),
    cultural_notes: p.cultural_notes,
    contact_info: p.contact_info
  };

  console.log(`📝 Drafting Tier ${tier} proposal for ${recipientName}...`);

  // Call Zia via MCP
  let draft;
  try {
    draft = await callMCP(tier, context);
    console.log(`✅ Zia drafted proposal (tone: ${draft.tone_notes})`);
  } catch (err) {
    console.error("❌ MCP call failed:", err.message);
    // Fallback: use a basic template
    draft = {
      subject: `Proposal Tier ${tier} from ${p.sender_name}`,
      body: `Assalamu alaikum ${recipientName},\n\nThis is a simulated Tier ${tier} proposal.\n\n${p.sender_name}`,
      tone_notes: "Fallback template (MCP unavailable)"
    };
  }

  // Send email
  const emailResult = await sendEmail(recipient, draft.subject, draft.body);

  // Update SoR
  const historyEntry = {
    tier: tier,
    sent_at: new Date().toISOString(),
    recipient: recipient,
    subject: draft.subject,
    body: draft.body,
    tone_notes: draft.tone_notes,
    reply: null,
    status: "sent"
  };
  p.history.push(historyEntry);
  p.status = "awaiting_reply";
  p.last_checked = new Date().toISOString();

  writeSoR(sor);

  console.log(`✅ Maker: Tier ${tier} sent, SoR updated.`);
  console.log(`   Next: Checker should verify, Watcher waits for reply.`);
}

main().catch(err => {
  console.error("❌ Maker failed:", err);
  process.exit(1);
});