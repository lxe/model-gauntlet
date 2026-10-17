// grade(output, specimen, g) → a score, 0–100 (the ⓘ in this head has the whole API)
// Fields out of a document into JSON, checked field by field: the score is the
// share of fields right, and each field's share across the rows is a metric of its own.

// the shape the prompt asked for
const Fields = z.object({
  vendor: z.string().min(1),
  date: z.string(),
  currency: z.string(),
  subtotal: z.number().nullable(),
  tax: z.number().nullable(),
  total: z.number(),
})
const FIELDS = ["vendor", "date", "currency", "subtotal", "tax", "total"]

function grade(output, specimen, g) {
  const o = g.check(Fields, g.json(output))
  if (!o) return 0
  const expected = specimen.field("expected")
  if (!expected) return 100
  const e = JSON.parse(expected)
  // amounts to the cent; the vendor by its first word ("Kestrel Outdoor" and
  // "KESTREL OUTDOOR GEAR LTD" are the same shop, a leading "The" aside); the rest exactly
  const near = (a, b) => typeof a === "number" && typeof b === "number" ? Math.abs(a - b) < 0.01 : a === b
  const first = (v) => String(v ?? "").toLowerCase().replace(/^the\s+/, "").split(/[\s,.]+/)[0]
  const right = FIELDS.map((k) => k === "vendor"
    ? g.expect(first(o.vendor) === first(e.vendor), "vendor: " + o.vendor + " ≠ " + e.vendor)
    : g.expect(near(o[k], e[k]), k + ": " + o[k] + " ≠ " + e[k]))
  FIELDS.forEach((k, i) => g.metric(k, right[i] ? 1 : 0))
  return 100 * right.filter(Boolean).length / right.length
}
