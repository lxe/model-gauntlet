# model-gauntlet

**Do you need Claude Opus to teach, grade and judge?** Six tasks graded by code, eleven models, every answer published. On structured work every model scores 96–100%. On the hard judgment task every model, Opus included, lands between 53% and 64%. Opus costs about 70 times as much per call as the cheapest model that matches it.

The tasks are the jobs a model does when it helps train other models: writing training answers (a teacher), grading answers against a reference (a judge), and making hard calls. Every grade comes from code, not from another model's opinion, so each score is checkable. [`src/verify.mjs`](src/verify.mjs) re-grades all 5,146 published answers with this repo's graders and gets the same grade every time.

<img src="docs/img/grayzone-vs-cost.svg" width="100%" alt="Grayzone pass rate with 95% intervals per model, every interval overlapping Opus's, beside dollars per 1,000 calls: Opus $7.73, the rest $0.11 to $1.67">

## Results (2026-10-16)

Scores in %. Each score is over the rows the model answered; timeouts are counted on their own. Cost is what OpenRouter billed.

| Model | classify | extract | redact | judge | judge, hard | **grayzone** | grayzone, default thinking | p50 (s) | timeouts | $ / 1K calls |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| inclusionai/ling-3.1-flash | 100 | 100 | 99 | 96 | 96 | **64** | 64 | 2.3 | 108 of 500 | 0.14 |
| anthropic/claude-opus-5.5 | 100 | 100 | 99 | 99 | 99 | **63** | 60 | 4.0 | 0 of 500 | 7.73 |
| xiaomi/mimo-v2.6-pro | 100 | 100 | 100 | 97 | 98 | **62** | 51 | 4.3 | 26 of 500 | 0.38 |
| z-ai/glm-5.3 | 100 | 100 | 100 | 97 | 96 | **61** | 65 | 1.3 | 31 of 500 | 1.25 |
| nvidia/nemotron-3.5-super-vl | 100 | 100 | 99 | 99 | 99 | **60** | 47 | 2.9 | 7 of 500 | 0.63 |
| deepseek/deepseek-v4.1-flash | 100 | 99 | 99 | 96 | 96 | **58** | 58 | 1.4 | 41 of 500 | 0.79 |
| xiaomi/mimo-v2.6-flash | 100 | 97 | 98 | 98 | 99 | **57** | 57 | 2.1 | 10 of 500 | **0.11** |
| z-ai/glm-5.3-flash | 100 | 99 | 99 | 97 | 97 | **57** | 54 | 1.7 | 11 of 500 | 0.21 |
| qwen/qwen3.8-27b | 97 | 100 | 98 | 96 | 96 | **56** | 44 | 1.8 | 34 of 500 | 1.26 |
| deepseek/deepseek-v4-pro | 100 | 100 | 99 | 97 | 97 | **54** | 53 | 2.5 | 85 of 500 | 1.67 |
| minimax/minimax-m3 | 100 | 100 | 100 | 96 | 97 | **53** | 58 | 1.6 | 0 of 500 | 0.55 |

Reproduce the table with `npm run report`. The answers are in [`results/2026-10-16/answers/`](results/2026-10-16/answers).

### The hard task in detail

`grayzone` has 120 rows, 60 phishing and 60 not, so its pass rate is balanced accuracy. Thinking was set to low. Intervals are 95% Wilson intervals.

| Model | Answered | Pass rate | Scams caught | Fine transfers cleared |
|---|---:|---:|---:|---:|
| inclusionai/ling-3.1-flash | 45 of 120 | 64% [50–77] | 56% | 70% |
| anthropic/claude-opus-5.5 | 120 of 120 | 63% [54–71] | 28% | 97% |
| xiaomi/mimo-v2.6-pro | 99 of 120 | 62% [52–71] | 38% | 83% |
| z-ai/glm-5.3 | 120 of 120 | 61% [52–69] | 45% | 77% |
| nvidia/nemotron-3.5-super-vl | 113 of 120 | 60% [51–69] | 35% | 86% |
| deepseek/deepseek-v4.1-flash | 95 of 120 | 58% [48–67] | 35% | 84% |
| xiaomi/mimo-v2.6-flash | 110 of 120 | 57% [48–66] | 15% | 96% |
| z-ai/glm-5.3-flash | 120 of 120 | 57% [48–65] | 53% | 60% |
| qwen/qwen3.8-27b | 119 of 120 | 56% [47–65] | 45% | 68% |
| deepseek/deepseek-v4-pro | 59 of 120 | 54% [42–66] | 53% | 55% |
| minimax/minimax-m3 | 120 of 120 | 53% [44–62] | 22% | 85% |

<img src="docs/img/grayzone-tradeoff.svg" alt="Scams caught against fine transfers cleared per model: Opus at 28% caught and 97% cleared; GLM-5.3 Flash and DeepSeek V4 Pro catch about 53% and clear 55-60%">

Every interval overlaps Opus's. With 120 rows, no model here is measurably better or worse than Opus at this task. What differs is the trade-off: Opus is among the most cautious, clearing 97% of fine transfers but catching only 28% of scams. GLM-5.3 Flash and DeepSeek V4 Pro flag about twice as many scams and also flag far more fine transfers.

## What it says

<img src="docs/img/structured-tasks.svg" alt="Scores on the five structured tasks for all eleven models: every cell between 96 and 100">

- **Structured work doesn't need Opus.** Classifying, extracting fields, redacting and checking an answer against a reference: every model scored 96–100%. Opus scored 99–100%, the same as the best of the rest. For a teacher or judge on these jobs, choose on price and reliability.
- **On hard judgment Opus is no better either.** All eleven models score 53–64% on `grayzone`, and the intervals overlap. Opus hits the same wall as models that cost a seventieth as much.
- **Opus's advantage is reliability.** It answered every call within the 30-second limit, and so did MiniMax M3. Ling 3.1 Flash and DeepSeek V4 Pro thought past the limit on half the hard rows, even with thinking set to low. A model that times out drops exactly the hardest rows, which also flatters its score.
<img src="docs/img/timeouts.svg" alt="Timeouts out of 500 calls per model: Opus and MiniMax M3 0, Ling 3.1 Flash 108">

- **Price per call differs about 70×:** MiMo V2.6 Flash cost $0.11 per 1,000 calls and Opus 5.5 $7.73. At the default routing, MiniMax M3 ($0.55) and GLM-5.3 Flash ($0.21) are the cheap choices that also time out rarely.

### Picks

| Job | Model | Why |
|---|---|---|
| Judge or grader | xiaomi/mimo-v2.6-flash | 98–99% on both judging tasks, $0.11 per 1K calls, timeouts rare |
| Judge, accuracy first | nvidia/nemotron-3.5-super-vl | 99% on both judging tasks, ties Opus at a twelfth of the price |
| Teacher, bulk rows | minimax/minimax-m3 | 100% on the structured tasks, never timed out, 1.6 s median |
| Hard calls | none stands out | add rows, add context, or train for the task |

### A note on "Opus gets 84%"

Before this run, Opus 5.5 looked much stronger on the same Ethereum data: **84%** on the full test split of 424 rows. That split is 83% negatives. On those rows Opus caught 34% of scams and cleared 94% of fine transfers, which is a **balanced accuracy of 64%**. That matches the 60–63% it scores here on balanced rows. A pass rate on a lopsided test set mostly measures how often a model says "fine".

## The tasks

| Task | Rows | The job | Graded by | Pass |
|---|---:|---|---|---|
| `classify` | 40 | Support ticket triage: one label of five | exact label | 100 |
| `extract` | 40 | Six fields from an emailed receipt or invoice, as JSON | field by field: amounts to the cent, vendor by its first word, the rest exact | 90 |
| `redact` | 40 | The same text with each piece of personal data replaced by its tag | a leaked span fails; extra tags and rewritten text cost | 100 |
| `judge` | 100 | A receipt, its reference JSON and a candidate: PASS or FAIL | the verdict against one known by construction | 100 |
| `judge-hard` | 100 | As `judge`, with errors that are easy to miss: two cents off, month and day swapped | as `judge` | 100 |
| `grayzone` | 120 | One outgoing Ethereum transfer that a cheap screen could neither clear nor block: RISK 1–5 | flagged at 4 or 5 against the phishing label | 50 |

Each folder in [`tasks/`](tasks) holds the system prompt (`prompt.txt`), the rows (`rows.jsonl`: `id`, `input`, `expected` and any fields the grader reads), the grader (`grader.js`) and `task.json` (threshold, measure, source).

The judging tasks are built from extraction rows. Half the candidates are right but written differently: keys reordered, the vendor as the document prints it. The other half have exactly one wrong field: a digit or two cents in an amount, a day, the currency, subtotal and tax swapped, tax dropped. The intended verdict is checked against the `extract` grader's own rules, so it's known by construction.

## How it was run

- **The runs:** made 2026-10-16 through [Pocket Model](https://pocketmodel.ai), which ran each model over each task's rows and graded the answers with these graders. Every model, Opus included, was called through OpenRouter with its default host routing.
- **Settings:** temperature 0, up to 64 calls in flight per model, and a 30-second limit per call. The answer text is graded; reasoning is not.
- **Thinking:** each model's default, except on `grayzone`, where thinking was set to low. At the default, several models thought past the limit on most rows. The default-thinking run, on 60 of the rows (30 of each class), is reported as its own column.
- **Retries:** in the default-thinking `grayzone` run, rows that timed out were asked once more. Everywhere else each row was asked once. The published answers are the final state.
- **Cost:** what OpenRouter billed, per model and task ([`costs.json`](results/2026-10-16/costs.json)). The whole run, including tries left out of the suite, came to $7.74.

## Run it yourself

```bash
npm install
OPENROUTER_API_KEY=... node src/run.mjs --model deepseek/deepseek-v4.1-flash
node src/report.mjs results/2026-10-16 results/runs/deepseek_deepseek-v4.1-flash
```

Options:

| Option | Default | What it sets |
|---|---|---|
| `--tasks extract,judge` | all | which tasks to run |
| `--think low\|medium\|high` | the model's default | OpenRouter `reasoning.effort` |
| `--concurrency N` | 16 | calls in flight |
| `--timeout S` | 30 | seconds per call |
| `--max-tokens N` | 8192 | output limit |
| `--base-url URL` | OpenRouter | any OpenAI-compatible endpoint; `OPENAI_API_KEY` is then the key |

A rerun asks only the rows that have no answer yet. `npm run verify` re-grades the published answers.

Your numbers will differ somewhat from these: hosts, load and the time limit all move them. The structured tasks are near their ceiling, so they separate models only at the bottom.

## Not covered

- **Tool calling.** None of the tasks gives the model tools.
- **Teaching itself.** The real test of a teacher is to train the same student on each teacher's answers and compare the students.
- **Cheapest-host routing.** OpenRouter's default host was used throughout; the cheapest host for a model can cost several times less.
- **Size.** 40–120 rows per task. Differences under about 10 points on `grayzone` are within noise.

## Data

- **`classify`, `extract`, `redact`:** synthetic support tickets, receipts and texts. They were written for Pocket Model's recipes by Qwen3.8-27B. Code decided every label and field, and DeepSeek V4.1 Flash checked the classify labels and the redactions.
- **`judge`, `judge-hard`:** built by code from `extract`-style rows (train and validation, not the test rows above).
- **`grayzone`:** public Ethereum mainnet transfers. The phishing labels come from Forta's [labelled-datasets](https://github.com/forta-network/labelled-datasets) (MIT). Addresses are shown only as roles (CUSTOMER, DEST); the transfer's own facts and its history are described in text.

Charts in [`docs/img`](docs/img) are drawn from `results/2026-10-16` by [`scripts/charts.py`](scripts/charts.py) (`python3 scripts/charts.py`, standard library only).

Code and data: MIT ([LICENSE](LICENSE)).
