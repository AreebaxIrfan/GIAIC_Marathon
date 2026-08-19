#!/usr/bin/env node
/**
 * Checker Agent — Five-Tier Proposal Loop (Maker-Checker, Concept 11)
 * Verifies Maker's work: email sent, tier correct, MCP called, no drift.
 * Runs after Maker on the same schedule.
 */

import fs from "fs";
import path from "path";

const SOR_PATH = path.resolve("proposal.json");
const EMAIL_LOG = path.resolve("email_log.jsonl");

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
  spawnSync("git", ["commit", "-m", `chore: checker verification — ${data.proposal.checker_ok ? "pass" : "FAIL"}`], { cwd: path.dirname(SOR_PATH) });
}

function spawnSync(cmd, args, opts = {}) {
  return new Promise((resolve) => {
    const { spawn } = require("child_process");
    const p = spawn(cmd, args, { ...opts, shell: true, stdio: "pipe" });
    let out = "", err = "";
    p.stdout.on("data", d => out += d);
    p.stderr.on("data", d => err += d);
    p.on("close", code => resolve({ code, out, err }));
  });
}

function readEmailLog() {
  if (!fs.existsSync(EMAIL_LOG)) return [];
  const lines = fs.readFileSync(EMAIL_LOG, "utf-8").trim().split("\n").filter(Boolean);
  return lines.map(l => JSON.parse(l));
}

// ============================================================
// CHECKS
// ============================================================

function checkEmailSent(sor, emailLog) {
  const latest = sor.proposal.history[sor.proposal.history.length - 1];
  if (!latest) return { pass: false, reason: "No history entry found" };

  // Find matching email in log (within last 5 minutes)
  const sentTime = new Date(latest.sent_at).getTime();
  const recentEmails = emailLog.filter(e => {
    const logTime = new Date(e.timestamp).getTime();
    return logTime >= sentTime - 300000 && logTime <= sentTime + 300000;
  });

  const match = recentEmails.find(e =>
    e.to === latest.recipient &&
    e.subject === latest.subject
  );

  if (!match) {
    return { pass: false, reason: `No matching email in log for tier ${latest.tier} to ${latest.recipient}` };
  }

  return { pass: true, detail: `Email logged: ${match.timestamp}` };
}

function checkTierConsistency(sor) {
  const latest = sor.proposal.history[sor.proposal.history.length - 1];
  if (!latest) return { pass: false, reason: "No history entry" };

  if (latest.tier !== sor.proposal.current_tier) {
    return { pass: false, reason: `Tier mismatch: history says ${latest.tier}, SoR current_tier says ${sor.proposal.current_tier}` };
  }

  return { pass: true };
}

function checkMCPCalled(sor) {
  // In a real setup, check .claude/mcp_logs or similar
  // For now, verify the history entry has tone_notes (indicates Zia was called)
  const latest = sor.proposal.history[sor.proposal.history.length - 1];
  if (!latest || !latest.tone_notes) {
    return { pass: false, reason: "No tone_notes in history — Zia may not have been called" };
  }
  if (latest.tone_notes.includes("Fallback")) {
    return { pass: false, reason: "Zia fallback used — MCP call likely failed" };
  }
  return { pass: true };
}

function checkRecipientCorrect(sor) {
  const latest = sor.proposal.history[sor.proposal.history.length - 1];
  const p = sor.proposal;

  let expectedRecipient = p.target;
  if (p.current_tier === "father") {
    expectedRecipient = p.father;
  }

  if (latest.recipient !== expectedRecipient) {
    return { pass: false, reason: `Recipient mismatch: sent to ${latest.recipient}, expected ${expectedRecipient}` };
  }
  return { pass: true };
}

function checkNoDrift(sor) {
  // Verify status is awaiting_reply after a send
  if (sor.proposal.status !== "awaiting_reply") {
    return { pass: false, reason: `Status is ${sor.proposal.status}, expected awaiting_reply after send` };
  }
  return { pass: true };
}

// ============================================================
// MAIN CHECKER LOGIC
// ============================================================

async function main() {
  console.log("🔍 Checker: Starting verification...");

  const sor = readSoR();
  const emailLog = readEmailLog();

  const checks = [
    { name: "Email sent & logged", fn: () => checkEmailSent(sor, emailLog) },
    { name: "Tier consistency", fn: () => checkTierConsistency(sor) },
    { name: "MCP (Zia) called", fn: () => checkMCPCalled(sor) },
    { name: "Recipient correct", fn: () => checkRecipientCorrect(sor) },
    { name: "No state drift", fn: () => checkNoDrift(sor) }
  ];

  const results = [];
  let allPass = true;

  for (const check of checks) {
    const result = check.fn();
    results.push({ check: check.name, ...result });
    if (!result.pass) allPass = false;
    console.log(`   ${result.pass ? "✅" : "❌"} ${check.name}: ${result.reason || result.detail || "OK"}`);
  }

  // Update SoR with checker result
  sor.proposal.checker_ok = allPass;
  sor.proposal.checker_reason = allPass ? "All checks passed" : results.filter(r => !r.pass).map(r => r.reason).join("; ");
  sor.proposal.last_checked = new Date().toISOString();

  writeSoR(sor);

  if (allPass) {
    console.log("✅ Checker: All verifications passed.");
  } else {
    console.error("❌ Checker: VERIFICATION FAILED — see SoR for details.");
    process.exit(1);
  }
}

main().catch(err => {
  console.error("❌ Checker failed:", err);
  process.exit(1);
});