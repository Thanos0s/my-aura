import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const convexBin = path.join(root, "node_modules", "convex", "bin", "main.js");
const seed = JSON.parse(readFileSync(new URL("./seed-visit.json", import.meta.url), "utf8"));
const visitId = process.argv[2];
if (!visitId) {
  console.error("usage: node scripts/confirm-visit.mjs <visitId>");
  process.exit(1);
}

const result = spawnSync(
  process.execPath,
  [
    convexBin,
    "run",
    "visits:confirmRecap",
    JSON.stringify({
      visitId,
      intakeJson: seed.intakeJson,
      recapText:
        "Main problem: abdominal pain. Location: right abdomen. Started: yesterday. Medicines: none known. Allergies: none known. Answered by: patient.",
    }),
  ],
  { encoding: "utf8" }
);
process.stdout.write(result.stdout);
process.stderr.write(result.stderr);

const queue = spawnSync(
  process.execPath,
  [convexBin, "run", "visits:listQueue", "{}"],
  { encoding: "utf8" }
);
process.stdout.write(queue.stdout);
process.stderr.write(queue.stderr);
