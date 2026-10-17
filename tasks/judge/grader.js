// the verdict against the one known by construction (scripts/gauntlet.mjs)
function grade(output, specimen, g) {
  const want = specimen.field("expected")
  const o = g.json(output)
  const said = String((o && o.verdict) || (/\b(PASS|FAIL)\b/i.exec(output) || [])[1] || "").toUpperCase()
  if (!g.expect(said === "PASS" || said === "FAIL", "no verdict")) return 0
  const right = said === want
  g.metric(want === "PASS" ? "passes the right" : "catches the wrong", right ? 1 : 0)
  g.expect(right, "said " + said + ", is " + want)
  return right ? 100 : 0
}
