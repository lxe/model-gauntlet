// grade(output, specimen, g) → a score, 0–100 (the ⓘ in this head has the whole API)
// The input with each piece of personal data replaced by its tag. A span
// left in the answer leaked (fn); a tag more than the expected answer has
// hid something it should not have (fp); eval_report gives F1 from their
// totals. Passing (100) means nothing leaked, nothing extra, the rest kept.
const TAG = /\[(NAME|EMAIL|PHONE|ADDRESS|ID|CARD)\]/g
// the spans the expected answer hides, read off the input: the text between
// its tags must be the input's, so what stands where each tag stands is the span
function spansOf(input, expected) {
  const parts = String(expected).split(TAG)
  const esc = (s) => s.replace(/[.*+?^$(){}|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+")
  let src = "^\\s*"
  const kinds = []
  parts.forEach((p, i) => { if (i % 2) { kinds.push(p); src += "([\\s\\S]+?)" } else src += esc(p) })
  const m = new RegExp(src + "\\s*$").exec(String(input))
  return m ? kinds.map((kind, i) => ({ kind, text: m[i + 1].trim() })) : null
}
const words = (s) => String(s).replace(TAG, " ").toLowerCase().split(/[^a-z0-9@.$-]+/).filter(Boolean)

function grade(output, specimen, g) {
  const expected = specimen.field("expected")
  if (!expected) return 100
  const spans = spansOf(specimen.text, expected)
  if (!spans) { g.expect(false, "the expected answer is not the input with spans tagged: fix its label"); return 0 }
  const out = String(output).trim()
  const leaked = spans.filter((s) => out.toLowerCase().includes(s.text.toLowerCase()))
  leaked.forEach((s) => g.expect(false, "leaked " + s.kind + ": " + s.text))
  const fp = Math.max(0, (out.match(TAG) || []).length - spans.length)
  g.expect(!fp, fp + " tag(s) more than there was personal data")
  // the rest of the text kept as it was
  const want = words(expected), got = new Set(words(out))
  const kept = want.length ? want.filter((w) => got.has(w)).length / want.length : 1
  g.expect(kept >= 0.9, "rewrote the text around the spans: " + Math.round(kept * 100) + "% of its words kept")
  const tp = spans.length - leaked.length
  g.metric("tp", tp, "sum"); g.metric("fp", fp, "sum"); g.metric("fn", leaked.length, "sum")
  g.metric("kept", kept)
  const f1 = tp + fp + leaked.length ? 2 * tp / (2 * tp + fp + leaked.length) : 1
  return Math.round(100 * f1 * Math.min(1, kept / 0.9))
}
