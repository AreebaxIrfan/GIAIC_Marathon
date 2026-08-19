#!/usr/bin/env node
/**
 * Reply Watcher — Five-Tier Proposal Loop (Concept 7: Event-Driven)
 * Polls for replies from the target (or father), updates SoR.
 * On "yes": sets status='yes', Maker will self-cancel.
 * On "no": sets status='no', Maker will increment tier.
 */

import fs from "fs";
import path from "path";
import { spawn } from "child_process";

const SOR_PATH = path.resolve("proposal.json");
const REPLY_LOG = path.resolve("reply_log.jsonl");

// ============================================================
// HELPERS
// ============================================================

function readSoR() {
  const raw = fs.readFileSync(SOR_PATH, "utf-8");
  return JSON.parse(raw);
}

function writeSoR(data) {
  fs.writeFileSync(SOR_PATH, JSON.stringify(data, null, 2));
  spawnSync("git", ["add", "proposal.json"], { cwd: path.dirname(SOR_PATH) });
  spawnSync("git", ["commit", "-m", `chore: watcher update — status ${data.proposal.status}`], { cwd: path.dirname(SOR_PATH) });
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

function pollInbox() {
  // SIMULATED: In production, use IMAP/webhook
  // Read from reply_log.jsonl (simulated replies)
  if (!fs.existsSync(REPLY_LOG)) return [];
  const lines = fs.readFileSync(REPLY_LOG, "utf-8").trim().split("\n").filter(Boolean);
  return lines.map(l => JSON.parse(l));
}

function classifyReply(text) {
  const lower = text.toLowerCase();
  if (lower.includes("yes") || lower.includes("accept") || lower.includes("agree") || lower.includes("i'd love to")) {
    return "yes";
  }
  if (lower.includes("no") || lower.includes("decline") || lower.includes("not interested") || lower.includes("cannot")) {
    return "no";
  }
  return "neutral";
}

// ============================================================
// MAIN WATCHER LOGIC
// ============================================================

async function main() {
  console.log("👁️ Watcher: Polling for replies...");

  const sor = readSoR();
  const p = sor.proposal;

  // Skip if already resolved
  if (p.status === "yes" || p.status === "father") {
    console.log(`   Status is '${p.status}', skipping watcher check.`);
    return;
  }

  // Get replies from log
  const replies = pollInbox();

  // Check for replies to any of our sent tiers
  const sentTiers = p.history.map(h => ({ tier: h.tier, recipient: h.recipient, sent_at: h.sent_at }));

  for (const reply of replies) {
    // Match reply to our sent email
    const match = sentTiers.find(s => {
      const replyTime = new Date(reply.received_at).getTime();
      const sentTime = new Date(s.sent_at).getTime();
      return reply.from === s.recipient && replyTime > sentTime;
    });

    if (match && !match.reply) {
      // Found an unmatched reply
      const classification = classifyReply(reply.body);

      console.log(`   📩 Reply from ${reply.from} (Tier ${match.tier}): "${reply.body.substring(0, 50)}..."`);
      console.log(`   Classification: ${classification}`);

      // Update history
      const historyEntry = p.history.find(h => h.tier === match.tier);
      if (historyEntry) {
        historyEntry.reply = reply.body;
        historyEntry.reply_received_at = reply.received_at;
      }

      // Update SoR status
      if (classification === "yes") {
        p.status = "yes";
        console.log("   ✅ YES DETECTED — status set to 'yes'. Maker will self-cancel.");
      } else if (classification === "no") {
        p.status = "no";
        console.log("   ❌ NO DETECTED — status set to 'no'. Maker will increment tier.");
      } else {
        console.log("   ⏸️  Neutral reply — no status change, will re-check next cycle.");
      }
    }
  }

  writeSoR(sor);
  console.log(`👁️ Watcher: Done. Current status: ${p.status}`);
}

main().catch(err => {
  console.error("❌ Watcher failed:", err);
  process.exit(1);
});