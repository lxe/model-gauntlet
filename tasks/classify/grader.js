// grade(output, specimen, g) → a score, 0–100 (the ⓘ in this head has the whole API)
// One label from a fixed set. Pass rate hides a model that never says the
// rare label, so each answer also counts tp/fp/fn: eval_report gives F1
// from their totals, with an interval. And pr_score / pr_label on every
// row, so a training run can keep its checkpoint by PR-AUC (select_by pr_auc).

// the labels a right answer is one of
const LABELS = ["billing", "bug", "account", "feature_request", "other"]
// the labels that must be caught, which F1 counts — e.g. ["fraud"] for screening,
// where saying "legit" every time passes 95% of rows and catches nothing.
// Empty: every label counts (F1 is then the share right).
const POSITIVE = []

// "Label: Bug." and "bug" are the same answer
const labelOf = (s) => String(s ?? "").trim().split("\n")[0]
  .replace(/^label\s*:\s*/i, "").replace(/[*.\x60"']/g, "").trim().toLowerCase()

function grade(output, specimen, g) {
  const said = labelOf(output)
  const want = labelOf(specimen.field("expected"))
  g.expect(LABELS.includes(said), '"' + said + '" is not one of the labels')
  const counts = POSITIVE.length ? POSITIVE : LABELS
  g.metric("tp", said === want && counts.includes(want) ? 1 : 0, "sum")
  g.metric("fp", said !== want && counts.includes(said) ? 1 : 0, "sum")
  g.metric("fn", said !== want && counts.includes(want) ? 1 : 0, "sum")
  // flagged or not, against whether it should be: the labels to catch, else any
  // but the last (the catch-all) — on every row, a wrong answer too
  const flags = POSITIVE.length ? POSITIVE : LABELS.slice(0, -1)
  g.metric("pr_score", flags.includes(said) ? 1 : 0)
  g.metric("pr_label", flags.includes(want) ? 1 : 0)
  return g.expect(said === want, (said || "(nothing)") + " ≠ " + want) ? 100 : 0
}
