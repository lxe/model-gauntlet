# model-gauntlet

Eleven language models, Claude Opus 5.5 among them, run on six tasks that a model does when it helps train another one: answering training rows, checking an answer against a reference, and making a hard yes-or-no call. Every answer is graded by code, and every answer from the 2026-10-16 run is in this repo.

<img src="docs/img/grayzone-vs-cost.svg" width="100%" alt="Grayzone pass rate with 95% intervals per model, every interval overlapping Opus's, beside dollars per 1,000 calls: Opus $7.73, the rest $0.11 to $1.67">

## Results

On the five structured tasks (classify, extract, redact, judge, judge-hard), every model scored between 96 and 100. On `grayzone`, the hard task, every model scored between 53 and 64, and all of the 95% intervals overlap, Opus's included.

The models differ more in price and reliability. Opus cost $7.73 per 1,000 calls and MiMo V2.6 Flash cost $0.11. Opus and MiniMax M3 never ran past the 30-second limit; Ling 3.1 Flash did on 108 of its 500 calls.

| Model | classify | extract | redact | judge | judge-hard | grayzone | grayzone, default thinking | p50 (s) | timeouts | $ / 1K calls |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| inclusionai/ling-3.1-flash | 100 | 100 | 99 | 96 | 96 | 64 | 64 | 2.3 | 108 of 500 | 0.14 |
| anthropic/claude-opus-5.5 | 100 | 100 | 99 | 99 | 99 | 63 | 60 | 4.0 | 0 of 500 | 7.73 |
| xiaomi/mimo-v2.6-pro | 100 | 100 | 100 | 97 | 98 | 62 | 51 | 4.3 | 26 of 500 | 0.38 |
| z-ai/glm-5.3 | 100 | 100 | 100 | 97 | 96 | 61 | 65 | 1.3 | 31 of 500 | 1.25 |
| nvidia/nemotron-3.5-super-vl | 100 | 100 | 99 | 99 | 99 | 60 | 47 | 2.9 | 7 of 500 | 0.63 |
| deepseek/deepseek-v4.1-flash | 100 | 99 | 99 | 96 | 96 | 58 | 58 | 1.4 | 41 of 500 | 0.79 |
| xiaomi/mimo-v2.6-flash | 100 | 97 | 98 | 98 | 99 | 57 | 57 | 2.1 | 10 of 500 | 0.11 |
| z-ai/glm-5.3-flash | 100 | 99 | 99 | 97 | 97 | 57 | 54 | 1.7 | 11 of 500 | 0.21 |
| qwen/qwen3.8-27b | 97 | 100 | 98 | 96 | 96 | 56 | 44 | 1.8 | 34 of 500 | 1.26 |
| deepseek/deepseek-v4-pro | 100 | 100 | 99 | 97 | 97 | 54 | 53 | 2.5 | 85 of 500 | 1.67 |
| minimax/minimax-m3 | 100 | 100 | 100 | 96 | 97 | 53 | 58 | 1.6 | 0 of 500 | 0.55 |

Scores are percentages over the rows a model answered. Timed-out calls are counted in the timeouts column, not in the scores. Cost is what OpenRouter billed. `npm run report` prints this table from [`results/2026-10-16`](results/2026-10-16).

<img src="docs/img/structured-tasks.svg" alt="Scores on the five structured tasks for all eleven models: every cell between 96 and 100">

### Timeouts

Each call had 30 seconds. Almost all timeouts are on `grayzone`, where some models reason for a long time before answering: Ling 3.1 Flash writes a median of about 1,950 tokens there at about 82 tokens per second, and DeepSeek V4.1 Flash about 2,260. Their longer answers pass 30 seconds. When the timed-out `grayzone` rows were asked again with little else running, the same rows timed out, so the cause is answer length, not load. Qwen3.8-27B is different: its timeouts are spread over the easy tasks as well, which points to its host stalling.

A timed-out row has no answer and does not count in the score. Those rows are likely the hard ones, so scores for models with many timeouts are probably too high.

<img src="docs/img/timeouts.svg" alt="Timeouts out of 500 calls per model: Opus and MiniMax M3 0, Ling 3.1 Flash 108">

### grayzone

`grayzone` has 120 Ethereum transfers, 60 to phishing addresses and 60 not. With equal classes, the share answered correctly is the balanced accuracy. Thinking was set to low for this task; the separate default-thinking column used 60 of the rows, 30 of each class.

| Model | Answered | Pass rate (95% interval) | Scams caught | Fine transfers cleared |
|---|---:|---:|---:|---:|
| inclusionai/ling-3.1-flash | 45 of 120 | 64% (50-77) | 56% | 70% |
| anthropic/claude-opus-5.5 | 120 of 120 | 63% (54-71) | 28% | 97% |
| xiaomi/mimo-v2.6-pro | 99 of 120 | 62% (52-71) | 38% | 83% |
| z-ai/glm-5.3 | 120 of 120 | 61% (52-69) | 45% | 77% |
| nvidia/nemotron-3.5-super-vl | 113 of 120 | 60% (51-69) | 35% | 86% |
| deepseek/deepseek-v4.1-flash | 95 of 120 | 58% (48-67) | 35% | 84% |
| xiaomi/mimo-v2.6-flash | 110 of 120 | 57% (48-66) | 15% | 96% |
| z-ai/glm-5.3-flash | 120 of 120 | 57% (48-65) | 53% | 60% |
| qwen/qwen3.8-27b | 119 of 120 | 56% (47-65) | 45% | 68% |
| deepseek/deepseek-v4-pro | 59 of 120 | 54% (42-66) | 53% | 55% |
| minimax/minimax-m3 | 120 of 120 | 53% (44-62) | 22% | 85% |

The models make different mistakes. Opus clears almost every fine transfer and catches 28% of the scams. GLM-5.3 Flash and DeepSeek V4 Pro catch about half the scams and wrongly flag about 40% of fine transfers.

<img src="docs/img/grayzone-tradeoff.svg" alt="Scams caught against fine transfers cleared per model: Opus at 28% caught and 97% cleared; GLM-5.3 Flash and DeepSeek V4 Pro catch about 53% and clear 55 to 60%">

Earlier, on the full test split these rows come from (424 transfers, 83% of them fine), Opus scored 84%. Its balanced accuracy there was 64%: it caught 34% of scams and cleared 94% of fine transfers. The high score came from the many fine transfers.

## Tasks

| Task | Rows | What the model does | How it is graded | Pass mark |
|---|---:|---|---|---:|
| `classify` | 40 | Labels a support ticket with one of five labels | exact label | 100 |
| `extract` | 40 | Pulls six fields from an emailed receipt or invoice into JSON | each field: amounts to the cent, vendor by first word, others exact | 90 |
| `redact` | 40 | Returns the text with each piece of personal data replaced by a tag | a leaked span fails the row; extra tags and rewritten text lower the score | 100 |
| `judge` | 100 | Says PASS or FAIL for a candidate answer, given the receipt and the reference JSON | the verdict against a known one | 100 |
| `judge-hard` | 100 | Same as `judge`, with smaller errors: two cents off, or month and day swapped | same | 100 |
| `grayzone` | 120 | Rates one outgoing Ethereum transfer from RISK 1 to RISK 5 | RISK 4 or 5 counts as flagged; checked against the phishing label | 50 |

Each folder in [`tasks/`](tasks) has the system prompt (`prompt.txt`), the rows (`rows.jsonl`), the grader (`grader.js`) and the pass mark and scoring (`task.json`).

The judge tasks are built from extraction rows. In half of them the candidate answer is correct but written differently (keys reordered, vendor name as printed). In the other half exactly one field is wrong: an amount, the date, the currency, subtotal and tax swapped, or tax missing. Each intended verdict is checked against the `extract` grader's rules.

## Running it

```bash
npm install
OPENROUTER_API_KEY=... node src/run.mjs --model deepseek/deepseek-v4.1-flash
node src/report.mjs results/2026-10-16 results/runs/deepseek_deepseek-v4.1-flash
```

| Option | Default | |
|---|---|---|
| `--tasks extract,judge` | all tasks | |
| `--think low\|medium\|high` | the model's default | sent as OpenRouter's `reasoning.effort` |
| `--concurrency N` | 16 | calls in flight |
| `--timeout S` | 30 | seconds per call |
| `--max-tokens N` | 8192 | |
| `--base-url URL` | OpenRouter | any OpenAI-compatible API; the key is then read from `OPENAI_API_KEY` |

Running again only asks the rows that have no answer yet.

`npm run verify` grades the published answers again with the graders in this repo. All 5,146 get the same grade they were published with.

`python3 scripts/charts.py` redraws the charts in [`docs/img`](docs/img) from the results (standard library only).

## How the published run was made

The run was made on 2026-10-16 with [Pocket Model](https://pocketmodel.ai), using the same prompts, rows and graders as this repo. Every model was called through OpenRouter with its default choice of host. Settings were temperature 0, up to 64 calls in flight per model, and a 30-second limit per call. Only the answer was graded, not the reasoning.

Thinking was each model's default, except on `grayzone`, where it was set to low because several models ran past the limit on most rows at the default. In the default-thinking `grayzone` run, timed-out rows were asked a second time. Every other row was asked once.

Cost per model and task is in [`costs.json`](results/2026-10-16/costs.json). The whole run, including attempts that are not in this repo, cost $7.74.

Your results will vary somewhat with the host, the load and the time limit.

## Limits

- 40 to 120 rows per task. On `grayzone`, differences under about 10 points are within noise.
- The five structured tasks are close to their ceiling, so they only separate models at the bottom.
- The 30-second limit cut off long answers; a longer limit would give the slow reasoners a fairer `grayzone` score.
- No task gives the model tools.
- Being right on these tasks is not the same as being a good teacher. That would need training the same student on each model's answers and comparing the students.
- Only OpenRouter's default host was used. Cheaper hosts exist for most of these models.

## Data and license

`classify`, `extract` and `redact` are synthetic. Qwen3.8-27B wrote the texts for Pocket Model's task templates; code set every label and field, and DeepSeek V4.1 Flash checked the classify labels and the redactions. The judge tasks are built by code from extraction rows that are not in the `extract` test set.

`grayzone` uses public Ethereum mainnet transfers. The phishing labels come from Forta's [labelled-datasets](https://github.com/forta-network/labelled-datasets) (MIT). The text names the two parties only as CUSTOMER and DEST.

Code and data are MIT licensed ([LICENSE](LICENSE)).
