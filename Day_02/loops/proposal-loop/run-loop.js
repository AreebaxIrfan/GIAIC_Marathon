#!/usr/bin/env node
/**
 * Local Test Runner — Runs Maker → Checker → Watcher in sequence
 * Simulates the daily cron execution for testing.
 */

import { spawn } from "child_process";
import path from "path";

const ROOT = path.resolve(".");

function runScript(name, script) {
  return new Promise((resolve, reject) => {
    console.log(`\n========== ${name} ==========`);
    const p = spawn("node", [script], { cwd: ROOT, stdio: "inherit", shell: true });
    p.on("close", code => {
      if (code === 0) {
        console.log(`\n✅ ${name} completed successfully`);
        resolve();
      } else {
        console.error(`\n❌ ${name} failed with code ${code}`);
        reject(new Error(`${name} exited with code ${code}`));
      }
    });
    p.on("error", reject);
  });
}

async function main() {
  console.log("🧪 LOCAL TEST RUN — Five-Tier Proposal Loop");
  console.log("==============================================");

  try {
    // Run Maker
    await runScript("MAKER (Tier 1)", "loops/proposal-loop/maker.js");

    // Run Checker
    await runScript("CHECKER", "loops/proposal-loop/checker.js");

    // Run Watcher (will find first simulated reply)
    await runScript("WATCHER", "loops/proposal-loop/watcher.js");

    console.log("\n🎉 FIRST CYCLE COMPLETE");
    console.log("   Check proposal.json for current state.");
    console.log("   Run again to simulate next day (Maker will increment to Tier 2).");

  } catch (err) {
    console.error("\n💥 Test run failed:", err.message);
    process.exit(1);
  }
}

main();