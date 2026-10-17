"""Draws the README's charts from a published run.

Run from the repo root:  python3 scripts/charts.py [results/2026-10-16]
Needs only Python 3.8+ and its standard library. Reads the run's answers/*.jsonl and costs.json,
tasks/*/task.json and tasks/grayzone/rows.jsonl; writes docs/img/*.svg:
  grayzone-vs-cost.svg   grayzone pass rate with 95% Wilson intervals, beside $ per 1,000 calls
  grayzone-tradeoff.svg  scams caught against fine transfers cleared on grayzone
  structured-tasks.svg   scores on the five structured tasks
  timeouts.svg           calls past the time limit, out of all calls

Numbers are computed the way src/report.mjs computes them: each score over the answered rows,
timeouts are answers whose error is "timed out", cost is costs.json's total over every call, and
values are rounded half up, as JavaScript's toFixed does. Each SVG carries its own light and dark
colors (prefers-color-scheme) on an opaque background, so it reads in either GitHub theme.
"""
import collections, json, math, os, sys
from decimal import Decimal, ROUND_HALF_UP

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RUN = os.path.join(ROOT, sys.argv[1] if len(sys.argv) > 1 else 'results/2026-10-16')
OUT = os.path.join(ROOT, 'docs/img/')
OPUS = 'anthropic/claude-opus-5.5'
STRUCTURED = ['classify', 'extract', 'redact', 'judge', 'judge-hard']

def fixed(x, f):  # JavaScript's toFixed: the exact binary value, ties up
    return str(Decimal(x).quantize(Decimal(1).scaleb(-f), ROUND_HALF_UP))

def wilson(p, n, z=1.96):
    c = (p + z * z / (2 * n)) / (1 + z * z / n)
    h = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / (1 + z * z / n)
    return c - h, c + h

def jsonl(path):
    with open(path) as f:
        return [json.loads(l) for l in f if l.strip()]

def load():
    answers = collections.defaultdict(lambda: collections.defaultdict(list))  # model -> task -> rows
    for f in sorted(os.listdir(os.path.join(RUN, 'answers'))):
        if f.endswith('.jsonl'):
            for a in jsonl(os.path.join(RUN, 'answers', f)):
                answers[a['model']][f[:-6]].append(a)
    costs = json.load(open(os.path.join(RUN, 'costs.json')))
    measure = {t: json.load(open(os.path.join(ROOT, 'tasks', t, 'task.json'))).get('measure', 'mean_score') for t in os.listdir(os.path.join(ROOT, 'tasks'))}
    label = {r['id']: r['label'] for r in jsonl(os.path.join(ROOT, 'tasks/grayzone/rows.jsonl'))}
    data = {}
    for m, tasks in answers.items():
        d = {}
        for t, xs in tasks.items():
            ok = [a for a in xs if not a.get('error')]
            if ok:
                pr = measure.get(t.split('@')[0]) == 'pass_rate'
                d[t] = 100 * sum(a['pass'] for a in ok) / len(ok) if pr else sum(a['score'] for a in ok) / len(ok)
        calls = sum(len(xs) for xs in tasks.values())
        d['timeouts'] = sum(1 for xs in tasks.values() for a in xs if a.get('error') == 'timed out')
        d['calls'] = calls
        usd = 0  # added up task by task in answer-file order, as report.mjs does, so the sum rounds the same way
        for t in tasks:
            usd += costs.get(m, {}).get(t, 0)
        d['per1k'] = usd / calls * 1000
        g = [a for a in tasks['grayzone'] if not a.get('error')]
        pos = [a for a in g if label[a['id']] == '1']
        neg = [a for a in g if label[a['id']] != '1']
        d['n'] = len(g)
        d['gp'] = sum(a['pass'] for a in g) / len(g)
        d['lo'], d['hi'] = wilson(d['gp'], len(g))
        d['rec'] = sum(a['pass'] for a in pos) / len(pos)
        d['spec'] = sum(a['pass'] for a in neg) / len(neg)
        data[m] = d
    return data

data = load()
ORDER = sorted(data, key=lambda m: -data[m]['gp'])  # as the README's tables: by grayzone
r0 = lambda x: int(math.floor(x + 0.5))

STYLE = """<style>
svg{--bg:#ffffff;--ink:#1f2328;--muted:#59636e;--faint:#818b98;--grid:#d1d9e0;--blue:#0969da;--opus:#bc4c00;--band:#fbefe3;--cell:#1a7f37}
@media (prefers-color-scheme:dark){svg{--bg:#0d1117;--ink:#e6edf3;--muted:#9198a1;--faint:#7d8590;--grid:#30363d;--blue:#4493f8;--opus:#f0883e;--band:#2b1d12;--cell:#3fb950}}
.bg{fill:var(--bg)} .frame{fill:none;stroke:var(--grid)}
text{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans",Helvetica,Arial,sans-serif;fill:var(--ink)}
.mono{font-family:ui-monospace,SFMono-Regular,"SF Mono",Menlo,Consolas,"Liberation Mono",monospace}
.t{font-size:18px;font-weight:600} .s{font-size:13px;fill:var(--muted)} .ax{font-size:12px;fill:var(--muted)} .lab{font-size:12.5px} .val{font-size:12px;fill:var(--muted)}
.opus{fill:var(--opus)} .optext{fill:var(--opus);font-weight:600} .blue{fill:var(--blue)} .grid{stroke:var(--grid);stroke-width:1}
.ci{stroke:var(--blue);stroke-width:2.5;stroke-linecap:round} .ci.o{stroke:var(--opus)} .band{fill:var(--band)} .ref{stroke:var(--opus);stroke-width:1;stroke-dasharray:3 3}
.hollow{fill:var(--bg);stroke:var(--blue);stroke-width:2} .iso{stroke:var(--grid);stroke-width:1;stroke-dasharray:4 4} .isot{font-size:11px;fill:var(--faint)}
.lead{stroke:var(--faint);stroke-width:1}
</style>"""
def svg(w, h, body, title):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}" role="img" aria-label="{title}">\n<title>{title}</title>\n{STYLE}\n<rect class="bg" width="{w}" height="{h}" rx="10"/>\n<rect class="frame" x="0.5" y="0.5" width="{w-1}" height="{h-1}" rx="10"/>\n{body}\n</svg>\n'
esc = lambda s: s.replace('&', '&amp;').replace('<', '&lt;')

# ---------------- 1. grayzone: interval per model, and price per call
def chart1():
    W, top, rh = 1020, 104, 34
    H = top + rh * len(ORDER) + 64
    L0, L1 = 350, 680          # score panel: 40%..80%
    C0, C1 = 740, 960          # cost panel: $0..$8, linear
    sx = lambda v: L0 + (v - 40) / 40 * (L1 - L0)
    cx = lambda v: C0 + v / 8 * (C1 - C0)
    b = [f'<text class="t" x="24" y="38">Hard calls (grayzone): every model lands at 53–64%, and every interval overlaps Opus’s</text>',
         f'<text class="s" x="24" y="62">Pass rate on 120 Ethereum transfers, 60 phishing and 60 not, thinking low; bars are 95% Wilson intervals. Right: $ per 1,000 calls over the whole suite.</text>']
    yb = top + rh * len(ORDER)
    o = data[OPUS]
    b.append(f'<rect class="band" x="{sx(o["lo"]*100):.1f}" y="{top-8}" width="{sx(o["hi"]*100)-sx(o["lo"]*100):.1f}" height="{yb-top+8}"/>')
    for v in range(40, 81, 10):
        b.append(f'<line class="grid" x1="{sx(v)}" x2="{sx(v)}" y1="{top-8}" y2="{yb}"/><text class="ax" x="{sx(v)}" y="{yb+18}" text-anchor="middle">{v}%</text>')
    b.append(f'<line class="ref" x1="{sx(o["gp"]*100):.1f}" x2="{sx(o["gp"]*100):.1f}" y1="{top-8}" y2="{yb}"/>')
    b.append(f'<text class="ax" x="{sx(o["hi"]*100)+4:.1f}" y="{top-12}" style="fill:var(--opus)">Opus’s interval</text>')
    for v in (0, 2, 4, 6, 8):
        b.append(f'<line class="grid" x1="{cx(v)}" x2="{cx(v)}" y1="{top-8}" y2="{yb}"/><text class="ax" x="{cx(v)}" y="{yb+18}" text-anchor="middle">${v}</text>')
    b.append(f'<text class="ax" x="{(L0+L1)/2}" y="{yb+40}" text-anchor="middle">grayzone pass rate</text>')
    b.append(f'<text class="ax" x="{(C0+C1)/2}" y="{yb+40}" text-anchor="middle">$ per 1,000 calls</text>')
    for i, m in enumerate(ORDER):
        d = data[m]; y = top + rh * i + rh / 2; op = m == OPUS
        lab = f'{esc(m)}' + ('' if d['n'] == 120 else f'  ({d["n"]} of 120)')
        b.append(f'<text class="mono lab{" optext" if op else ""}" x="{L0-16}" y="{y+4}" text-anchor="end">{lab}</text>')
        b.append(f'<line class="ci{" o" if op else ""}" x1="{sx(d["lo"]*100):.1f}" x2="{sx(d["hi"]*100):.1f}" y1="{y}" y2="{y}"/>')
        b.append(f'<circle class="{"opus" if op else "blue"}" cx="{sx(d["gp"]*100):.1f}" cy="{y}" r="5.5"/>')
        b.append(f'<text class="val" x="{sx(d["hi"]*100)+8:.1f}" y="{y+4}">{r0(d["gp"]*100)}%</text>')
        c = data[m]['per1k']
        b.append(f'<rect class="{"opus" if op else "blue"}" x="{C0}" y="{y-7}" width="{max(2, cx(c)-C0):.1f}" height="14" rx="2"/>')
        b.append(f'<text class="val{" optext" if op else ""}" x="{cx(c)+6:.1f}" y="{y+4}">${fixed(c, 2)}</text>')
    open(OUT + 'grayzone-vs-cost.svg', 'w').write(svg(W, H, '\n'.join(b), 'grayzone pass rate with 95% intervals against price per 1,000 calls, eleven models'))

# ---------------- 2. the trade-off: scams caught against fine transfers cleared
def chart2():
    W, H = 900, 580
    X0, X1, Y0, Y1 = 80, 860, 490, 110   # x: cleared 50..100, y: caught 0..60
    sx = lambda v: X0 + (v - 50) / 50 * (X1 - X0)
    sy = lambda v: Y0 - v / 60 * (Y0 - Y1)
    b = ['<text class="t" x="24" y="38">The trade-off on grayzone: Opus clears almost every fine transfer and catches few scams</text>',
         '<text class="s" x="24" y="62">Share of phishing transfers flagged against share of fine transfers cleared. Dashed lines join points with equal pass rate</text>',
         '<text class="s" x="24" y="80">(the average of the two). Hollow: the model answered fewer than 100 of the 120 rows.</text>']
    for v in range(50, 101, 10):
        b.append(f'<line class="grid" x1="{sx(v)}" x2="{sx(v)}" y1="{Y1}" y2="{Y0}"/><text class="ax" x="{sx(v)}" y="{Y0+18}" text-anchor="middle">{v}%</text>')
    for v in range(0, 61, 10):
        b.append(f'<line class="grid" x1="{X0}" x2="{X1}" y1="{sy(v)}" y2="{sy(v)}"/><text class="ax" x="{X0-8}" y="{sy(v)+4}" text-anchor="end">{v}%</text>')
    for ba in (50, 60, 70):   # caught = 2*pass - cleared
        c1 = max(50, 2 * ba - 60); r1 = 2 * ba - c1; c2 = 100; r2 = 2 * ba - 100
        b.append(f'<line class="iso" x1="{sx(c1):.1f}" y1="{sy(r1):.1f}" x2="{sx(c2):.1f}" y2="{sy(r2):.1f}"/>')
        b.append(f'<text class="isot" x="{sx(99.6):.1f}" y="{sy(r2+1.6):.1f}" text-anchor="end">{ba}% pass</text>')
    b.append(f'<text class="ax" x="{(X0+X1)/2}" y="{Y0+42}" text-anchor="middle">fine transfers cleared →</text>')
    b.append(f'<text class="ax" transform="translate({X0-50} {(Y0+Y1)/2}) rotate(-90)" text-anchor="middle">scams caught →</text>')
    OFF = {OPUS: (-12, 4, 'end'), 'xiaomi/mimo-v2.6-flash': (-11, 4, 'end'), 'minimax/minimax-m3': (-11, 4, 'end'),
           'nvidia/nemotron-3.5-super-vl': (11, 4, 'start'), 'deepseek/deepseek-v4.1-flash': (-11, 12, 'end'),
           'xiaomi/mimo-v2.6-pro': (-11, -3, 'end'), 'z-ai/glm-5.3': (11, 4, 'start'), 'qwen/qwen3.8-27b': (0, 22, 'middle'),
           'inclusionai/ling-3.1-flash': (11, 4, 'start'), 'z-ai/glm-5.3-flash': (11, 18, 'start'), 'deepseek/deepseek-v4-pro': (-8, -13, 'start')}
    for m in ORDER:
        d = data[m]; x, y = sx(d['spec'] * 100), sy(d['rec'] * 100); op = m == OPUS
        cls = 'opus' if op else ('hollow' if d['n'] < 100 else 'blue')
        b.append(f'<circle class="{cls}" cx="{x:.1f}" cy="{y:.1f}" r="{6.5 if op else 5.5}"/>')
        dx, dy, an = OFF[m]
        extra = f' <tspan class="val optext">{r0(d["rec"]*100)}% caught, {r0(d["spec"]*100)}% cleared</tspan>' if op else ''
        if op:  # Opus: name above the numbers
            b.append(f'<text class="mono lab optext" x="{x+dx:.1f}" y="{y-6:.1f}" text-anchor="end">{esc(m)}</text>')
            b.append(f'<text class="val optext" x="{x+dx:.1f}" y="{y+10:.1f}" text-anchor="end">{r0(d["rec"]*100)}% caught, {r0(d["spec"]*100)}% cleared</text>')
        else:
            b.append(f'<text class="mono lab" x="{x+dx:.1f}" y="{y+dy:.1f}" text-anchor="{an}">{esc(m)}</text>')
    open(OUT + 'grayzone-tradeoff.svg', 'w').write(svg(W, H, '\n'.join(b), 'Scams caught against fine transfers cleared on grayzone, eleven models'))

# ---------------- 3. structured tasks: a table of scores
def chart3():
    T = ['classify', 'extract', 'redact', 'judge', 'judge-hard']
    W, top, rh, cw = 760, 110, 30, 84
    H = top + rh * len(ORDER) + 40
    C0 = 300
    b = ['<text class="t" x="24" y="38">Structured tasks: every model scores 96–100%</text>',
         '<text class="s" x="24" y="62">Score in % per task, graded by code. 40 rows each for classify, extract and redact; 100 each for the judge tasks.</text>']
    for j, t in enumerate(T):
        b.append(f'<text class="mono ax" x="{C0 + cw*j + cw/2}" y="{top-12}" text-anchor="middle">{t}</text>')
    for i, m in enumerate(ORDER):
        y = top + rh * i; op = m == OPUS
        b.append(f'<text class="mono lab{" optext" if op else ""}" x="{C0-16}" y="{y+rh/2+4}" text-anchor="end">{esc(m)}</text>')
        for j, t in enumerate(T):
            v = data[m][t]
            a = 0.10 + 0.55 * max(0, (v - 90) / 10)   # 90 → faint, 100 → strongest
            b.append(f'<rect x="{C0 + cw*j + 2}" y="{y+2}" width="{cw-4}" height="{rh-4}" rx="4" style="fill:var(--cell);fill-opacity:{a:.2f}"/>')
            b.append(f'<text class="mono" x="{C0 + cw*j + cw/2}" y="{y+rh/2+4.5}" text-anchor="middle" style="font-size:13px">{r0(v)}</text>')
    open(OUT + 'structured-tasks.svg', 'w').write(svg(W, H, '\n'.join(b), 'Scores on the five structured tasks, eleven models, all 96 to 100 percent'))

# ---------------- 4. reliability: timeouts out of 500 calls
def chart4():
    order = sorted(ORDER, key=lambda m: data[m]['timeouts'])
    W, top, rh = 760, 96, 28
    H = top + rh * len(order) + 46
    B0, B1 = 300, 700
    bx = lambda v: B0 + v / 120 * (B1 - B0)
    b = ['<text class="t" x="24" y="38">Reliability: timeouts out of 500 calls</text>',
         '<text class="s" x="24" y="62">Calls that passed the 30-second limit, across all seven runs. A model that times out drops the hardest rows.</text>']
    yb = top + rh * len(order)
    for v in range(0, 121, 20):
        b.append(f'<line class="grid" x1="{bx(v)}" x2="{bx(v)}" y1="{top-6}" y2="{yb}"/><text class="ax" x="{bx(v)}" y="{yb+18}" text-anchor="middle">{v}</text>')
    for i, m in enumerate(order):
        y = top + rh * i + rh / 2; op = m == OPUS; v = data[m]['timeouts']
        b.append(f'<text class="mono lab{" optext" if op else ""}" x="{B0-16}" y="{y+4}" text-anchor="end">{esc(m)}</text>')
        if v: b.append(f'<rect class="{"opus" if op else "blue"}" x="{B0}" y="{y-7}" width="{bx(v)-B0:.1f}" height="14" rx="2"/>')
        b.append(f'<text class="val{" optext" if op else ""}" x="{bx(v)+(6 if v else 4):.1f}" y="{y+4}">{v}</text>')
    open(OUT + 'timeouts.svg', 'w').write(svg(W, H, '\n'.join(b), 'Timeouts out of 500 calls per model'))


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    chart1(); chart2(); chart3(); chart4()
    print('wrote', ', '.join(sorted(f for f in os.listdir(OUT) if f.endswith('.svg'))))
