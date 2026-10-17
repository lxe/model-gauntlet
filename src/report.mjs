// The results table, from one or more result folders (published runs, or your own from src/run.mjs).
//
//   node src/report.mjs results/2026-10-16 [results/runs/my-model ...]
//
// Per task: the mean score, or for tasks whose classes are balanced (task.json "measure": "pass_rate") the share
// that passed, which is then balanced accuracy. Each score is over the rows the model answered; timeouts and
// errors are counted apart. Cost comes from the answers where the endpoint reported it, else from the folder's
// costs.json.
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const dirs = process.argv.slice(2);
if (!dirs.length) { console.error("usage: node src/report.mjs <results folder>..."); process.exit(2); }

const TASKS = readdirSync(join(ROOT, "tasks")).filter((t) => statSync(join(ROOT, "tasks", t)).isDirectory());
const meta = Object.fromEntries(TASKS.map((t) => [t, JSON.parse(readFileSync(join(ROOT, "tasks", t, "task.json"), "utf8"))]));
const lines = (f) => readFileSync(f, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));

/* model → task → answers; also results kept per setting (a folder's answers/<task>.jsonl, or <task>.jsonl) */
const by = {}, cost = {};
for (const d of dirs) {
  const at = existsSync(join(d, "answers")) ? join(d, "answers") : d;
  for (const f of readdirSync(at).filter((f) => f.endsWith(".jsonl"))) {
    const task = f.replace(/\.jsonl$/, "");
    for (const a of lines(join(at, f))) ((by[a.model] ??= {})[task] ??= []).push(a);
  }
  if (existsSync(join(d, "costs.json"))) for (const [m, t] of Object.entries(JSON.parse(readFileSync(join(d, "costs.json"), "utf8")))) for (const [task, usd] of Object.entries(t)) ((cost[m] ??= {})[task] = usd);
}

/* structured tasks first, the hard one last; a setting's run (task@setting) beside its task */
const ORDER = ["classify", "extract", "redact", "judge", "judge-hard", "grayzone"];
const rank = (t) => ORDER.indexOf(t.replace(/@.*/, "")) * 2 + (t.includes("@") ? 1 : 0);
const shown = [...new Set(Object.values(by).flatMap((t) => Object.keys(t)))].sort((a, b) => rank(a) - rank(b));
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : null; };
const rows = Object.entries(by).map(([model, t]) => {
  const cells = shown.map((task) => {
    const xs = t[task] ?? [], ok = xs.filter((a) => !a.error);
    if (!ok.length) return null;
    const m = meta[task.replace(/@.*/, "")]?.measure ?? "mean_score";
    return m === "pass_rate" ? (100 * ok.filter((a) => a.pass).length) / ok.length : ok.reduce((s, a) => s + a.score, 0) / ok.length;
  });
  const all = Object.values(t).flat(), ok = all.filter((a) => !a.error);
  const timeouts = all.filter((a) => a.error === "timed out").length;
  const usd = Object.entries(t).reduce((s, [task, xs]) => s + (xs.some((a) => a.usd != null) ? xs.reduce((u, a) => u + (a.usd ?? 0), 0) : cost[model]?.[task] ?? 0), 0);
  return { model, cells, p50: median(ok.map((a) => a.ms)), timeouts, calls: all.length, per1k: all.length ? (usd / all.length) * 1000 : null };
});
/* by the hard task, where the models differ */
const hard = shown.indexOf("grayzone");
rows.sort((a, b) => (b.cells[hard] ?? 0) - (a.cells[hard] ?? 0));
const f0 = (x) => (x == null ? "–" : Math.round(x));
console.log(`| Model | ${shown.join(" | ")} | p50 (s) | timeouts | $ / 1K calls |`);
console.log(`|---|${shown.map(() => "---:").join("|")}|---:|---:|---:|`);
for (const r of rows) console.log(`| ${r.model} | ${r.cells.map(f0).join(" | ")} | ${r.p50 == null ? "–" : (r.p50 / 1000).toFixed(1)} | ${r.timeouts} of ${r.calls} | ${r.per1k == null ? "–" : r.per1k.toFixed(2)} |`);
