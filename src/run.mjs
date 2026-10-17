// Runs one model over the tasks and grades every answer.
//
//   node src/run.mjs --model deepseek/deepseek-v4.1-flash [--tasks extract,judge] [--think low]
//                    [--concurrency 16] [--timeout 30] [--max-tokens 8192] [--base-url URL] [--out results/mine]
//
// The endpoint is any OpenAI-compatible chat API: OpenRouter by default (OPENROUTER_API_KEY), or --base-url
// with OPENAI_API_KEY. Each task's prompt is the system message, each row's input the user message, at
// temperature 0. Answers land in <out>/<task>.jsonl, one line per row: the answer, its grade, time, tokens and,
// where the endpoint reports it (OpenRouter does), its cost.
import { readFileSync, mkdirSync, readdirSync, appendFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { compile, grade } from "./grader.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const arg = (name, d) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : d; };

const model = arg("model");
if (!model) { console.error("usage: node src/run.mjs --model <id> [--tasks a,b] [--think low|medium|high] [--concurrency N] [--timeout s]"); process.exit(2); }
const base = arg("base-url", "https://openrouter.ai/api/v1").replace(/\/$/, "");
const key = process.env.OPENROUTER_API_KEY ?? process.env.OPENAI_API_KEY;
if (!key) { console.error("set OPENROUTER_API_KEY (or OPENAI_API_KEY with --base-url)"); process.exit(2); }
const tasks = (arg("tasks") ?? readdirSync(join(ROOT, "tasks")).join(",")).split(",");
const think = arg("think"), concurrency = Number(arg("concurrency", 16)), timeoutS = Number(arg("timeout", 30)), maxTokens = Number(arg("max-tokens", 8192));
const out = arg("out", join(ROOT, "results", "runs", model.replace(/[^\w.-]+/g, "_") + (think ? `-think-${think}` : "")));
const openrouter = base.includes("openrouter.ai");

/* the answer without reasoning: providers that put it in the content wrap it in <think> */
const answerOf = (text) => String(text ?? "").replace(/<think>[\s\S]*?<\/think>/g, "").trim();

async function ask(system, input) {
  const body = {
    model, temperature: 0, max_tokens: maxTokens,
    messages: [{ role: "system", content: system }, { role: "user", content: input }],
    ...(think && openrouter ? { reasoning: { effort: think } } : think ? { reasoning_effort: think } : {}),
    ...(openrouter ? { usage: { include: true } } : {}),
  };
  const t0 = Date.now();
  try {
    const r = await fetch(`${base}/chat/completions`, { method: "POST", headers: { authorization: `Bearer ${key}`, "content-type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(timeoutS * 1000) });
    const j = await r.json().catch(() => ({}));
    const ms = Date.now() - t0;
    if (!r.ok || j.error) return { ms, error: j.error?.message ?? `HTTP ${r.status}` };
    const u = j.usage ?? {};
    return { ms, output: answerOf(j.choices?.[0]?.message?.content), in_tokens: u.prompt_tokens ?? null, out_tokens: u.completion_tokens ?? null, usd: u.cost ?? null };
  } catch (e) {
    return { ms: Date.now() - t0, error: e.name === "TimeoutError" ? "timed out" : String(e.message) };
  }
}

/* N at once, in row order */
async function pool(items, n, f) {
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (next < items.length) { const k = next++; await f(items[k], k); } }));
}

mkdirSync(out, { recursive: true });
for (const task of tasks) {
  const dir = join(ROOT, "tasks", task);
  const meta = JSON.parse(readFileSync(join(dir, "task.json"), "utf8"));
  const system = readFileSync(join(dir, "prompt.txt"), "utf8");
  const fn = compile(readFileSync(join(dir, "grader.js"), "utf8"));
  const rows = readFileSync(join(dir, "rows.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  const file = join(out, `${task}.jsonl`);
  /* rows already answered are kept: a rerun asks only what is missing */
  const done = new Set(existsSync(file) ? readFileSync(file, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)).filter((x) => !x.error).map((x) => x.id) : []);
  const todo = rows.filter((r) => !done.has(r.id));
  let passed = 0, answered = 0;
  await pool(todo, concurrency, async (row) => {
    const a = await ask(system, row.input);
    const g = a.error ? { score: 0, pass: false, issues: [a.error] } : grade(fn, a.output, row, meta.threshold);
    if (!a.error) { answered++; if (g.pass) passed++; }
    appendFileSync(file, JSON.stringify({ id: row.id, model, ...a, score: g.score, pass: g.pass, issues: g.issues }) + "\n");
  });
  console.log(`${task}: ${answered}/${todo.length} answered, ${passed} passed${todo.length < rows.length ? ` (${rows.length - todo.length} kept from before)` : ""}`);
}
console.log(`answers in ${out}; node src/report.mjs ${out}`);
