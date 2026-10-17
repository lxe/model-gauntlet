// grade(output, specimen, g) → 0–100. Task: is DEST (the destination of this outgoing transfer) a known scam/phishing address?
// The answer ends with "RISK: n", n = 1 (clearly fine) … 5 (almost certainly scam). Flag = 4 or 5.
// Partial credit for adjacent levels; score ≥ 50 (the pass mark) exactly when the flag decision is right.
const POS_SCORE = {5: 100, 4: 80, 3: 35, 2: 15, 1: 0}
const NEG_SCORE = {1: 100, 2: 90, 3: 65, 4: 25, 5: 0}

function levelOf(output) {
  const s = String(output ?? "")
  const all = [...s.matchAll(/RISK\s*[:=]\s*\**\s*([1-5])\b/gi)]
  return all.length ? Number(all[all.length - 1][1]) : null   // the last one: reasoning may mention levels before it
}

function grade(output, specimen, g) {
  const positive = String(specimen.field("label")) === "1"
  const usd = Number(specimen.field("usd")) || 0
  const level = levelOf(output)
  const parsed = g.expect(level !== null, "no 'RISK: 1-5' line")
  const lv = parsed ? level : 1               // unparsable: counted as not flagged
  const flagged = lv >= 4
  g.metric("tp", positive && flagged ? 1 : 0, "sum")
  g.metric("fp", !positive && flagged ? 1 : 0, "sum")
  g.metric("fn", positive && !flagged ? 1 : 0, "sum")
  g.metric("tn", !positive && !flagged ? 1 : 0, "sum")
  // base-rate-independent views: balanced accuracy = (recall + specificity) / 2
  g.metric("recall", positive && flagged ? 1 : 0, "ratio", positive ? 1 : 0)
  g.metric("specificity", !positive && !flagged ? 1 : 0, "ratio", !positive ? 1 : 0)
  g.metric("precision", positive && flagged ? 1 : 0, "ratio", flagged ? 1 : 0)
  g.metric("usd_recall", positive && flagged ? usd : 0, "ratio", positive ? usd : 0)
  const pr = (lv - 1) / 4
  g.metric("pr_score", pr)
  g.metric("pr_label", positive ? 1 : 0)
  g.score(pr, positive)
  // cost-weighted view (a miss costs the amount, floor $50; a false alarm $15 of analyst time + friction)
  g.reward_cost({level: lv, positive, amount: Math.max(usd, 50), false_alarm: 15})
  if (!parsed) return 0
  g.expect(flagged === positive, positive ? "missed: RISK " + lv : "false alarm: RISK " + lv)
  return positive ? POS_SCORE[lv] : NEG_SCORE[lv]
}
