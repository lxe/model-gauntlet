// Re-grades every published answer with this repo's graders and compares with the published grade (which Pocket
// Model gave when the runs were made). Any difference is printed; the exit code is 1 if there is one.
//
//   node src/verify.mjs [results/2026-10-16]
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { compile, grade } from "./grader.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = process.argv[2] ?? join(ROOT, "results", "2026-10-16");
const lines = (f) => readFileSync(f, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
let checked = 0, differ = 0;
for (const f of readdirSync(join(dir, "answers"))) {
  const task = f.replace(/\.jsonl$/, "").replace(/@.*/, "");
  const meta = JSON.parse(readFileSync(join(ROOT, "tasks", task, "task.json"), "utf8"));
  const fn = compile(readFileSync(join(ROOT, "tasks", task, "grader.js"), "utf8"));
  const rows = Object.fromEntries(lines(join(ROOT, "tasks", task, "rows.jsonl")).map((r) => [r.id, r]));
  for (const a of lines(join(dir, "answers", f))) {
    if (a.error) continue;
    const g = grade(fn, a.output, rows[a.id], meta.threshold);
    checked++;
    if (g.score !== a.score || g.pass !== a.pass) { differ++; if (differ <= 10) console.log(`${f} ${a.id} ${a.model}: published ${a.score}/${a.pass}, here ${g.score}/${g.pass} ${g.issues.join("; ")}`); }
  }
}
console.log(`${checked} answers re-graded, ${differ} differ`);
process.exit(differ ? 1 : 0);
