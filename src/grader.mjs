// Runs a task's grader (tasks/<task>/grader.js) on one answer.
//
// A grader is plain JavaScript: grade(output, specimen, g) returns a score from 0 to 100. It gets the same
// helpers as in Pocket Model, where these tasks came from:
//   g.json(text)               JSON.parse; on text that is not JSON, records why and returns undefined
//   g.check(schema, value)     a zod schema's parse; records each problem and returns undefined on failure
//   g.expect(ok, message)      records the message when ok is false; returns ok
//   g.metric(name, value, how) a per-answer number ("mean", "sum" or "ratio"), kept with the grade
//   g.score / g.reward_cost    ranking and cost-weighted views (kept, not used for pass/fail here)
// The answer passes when its score is at least the task's threshold (tasks/<task>/task.json).
import { z } from "zod";

export function compile(code) {
  // the grader's own code, with zod in scope as z
  const make = new Function("z", `"use strict";\n${code}\n;return grade;`);
  return make(z);
}

export function grade(fn, output, row, threshold) {
  const issues = [], metrics = {};
  let unparsed = false;
  const g = {
    json(text) {
      try { return JSON.parse(text); } catch {
        issues.push(!String(text ?? "").trim() ? "not JSON: empty" : /^\s*```/.test(text) ? "not JSON: wrapped in a ``` fence" : "not JSON");
        unparsed = true;
        return undefined;
      }
    },
    check(schema, value) {
      if (value === undefined && unparsed) return undefined;
      const r = schema.safeParse(value);
      if (r.success) return r.data;
      for (const i of r.error.issues) issues.push(`${i.path.join(".") ? i.path.join(".") + ": " : ""}${i.message}`);
      return undefined;
    },
    expect(ok, message) { if (!ok) issues.push(String(message ?? "an expectation failed")); return !!ok; },
    metric(name, value) { metrics[name] = typeof value === "number" ? value : value ? 1 : 0; },
    score() {},
    reward_cost() { return 0; },
    judge() { throw new Error("this suite's graders do not ask a judge"); },
  };
  const specimen = { text: row.input, field: (name) => (name === "expected" ? row.expected : row[name] ?? null) };
  try {
    const v = fn(String(output ?? ""), specimen, g);
    const raw = typeof v === "boolean" ? (v ? 100 : 0) : typeof v === "number" && Number.isFinite(v) ? v : v == null ? (issues.length ? 0 : 100) : v ? 100 : 0;
    const score = Math.round(Math.max(0, Math.min(100, raw)));
    return { score, pass: score >= threshold, issues, metrics };
  } catch (e) {
    return { score: 0, pass: false, issues: [...issues, `grader threw: ${e.message}`], metrics };
  }
}
