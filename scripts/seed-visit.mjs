import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const payload = JSON.stringify(
  JSON.parse(readFileSync(new URL("./seed-visit.json", import.meta.url), "utf8"))
);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const convexBin = path.join(root, "node_modules", "convex", "bin", "main.js");
const result = spawnSync(process.execPath, [convexBin, "run", "visits:startVisit", payload], {
  stdio: "inherit",
});
if (result.error) {
  console.error(result.error);
}
process.exit(result.status ?? 1);


