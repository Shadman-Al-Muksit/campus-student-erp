# Campus ERP exploratory usability pilot

**Study status: prepared, not conducted. No participant observations or human-study findings are included.**

This folder contains the reproducible materials for examining the combined interactive dashboard and navigation helper. It does not establish that these additions improve usability or academic performance.

## What to open

- [Protocol](PROTOCOL.md): study question, comparison, balanced assignments, collection procedure, and limits.
- [Session script](SESSION_SCRIPT.md): introduction, consent questions, task instructions, and debrief in English and Bangla.
- [Data dictionary](DATA_DICTIONARY.md): exactly how to record one task attempt.
- [Observation template](observations_template.csv): column headers only. Copy it into a private local directory before recording actual observations.
- [Report template](REPORT_TEMPLATE.md): what must be reported after sessions.
- [Analysis program](analyze.py): validates observations and produces descriptive tables, figures, and a draft report.

## Run the analysis

Run these from the project root in the project's Python environment. See the [main README](../README.md) for setup.

```bash
source scripts/env.sh
python -m pip install -r research/requirements_research.txt
mkdir -p research/local_data
cp research/observations_template.csv research/local_data/observations.csv
# Record only actual, consented task attempts in the local copy.
python research/analyze.py \
  --input research/local_data/observations.csv \
  --output research/output/session-round-01
```

The empty template intentionally exits with code 2 and `No observations`. It writes no report or chart. This is expected before a study is conducted.

By default, each included participant must have four tasks in each of the two modes. If somebody stops early, retain their recorded attempts only if they still consent to their use. Run with `--allow-incomplete` to describe the partial pilot explicitly. Missing tasks are reported, not converted to failed tasks, zeros, or guessed times.

Outputs are `summary.json`, `paired_participant_outcomes.csv`, `matched_task_times.csv`, `task_outcomes.png`, a matched-time plot when eligible pairs exist, and `report.md`. Per-participant comparisons use complete sessions only; all recorded attempts remain in outcome counts. The report includes source-file SHA-256 for reproducibility. Match raw files to this hash in private storage. Generated summaries need human interpretation before publication.

Use a new output directory per run. The program refuses to overwrite a nonempty results directory.

## Software tests

```bash
python -m unittest discover -s research/tests -v
```

Tests construct synthetic records in temporary directories. They check validation, pairing, failure handling, chart generation, and synthetic labelling. Those fixtures are not research evidence. The analysis program refuses synthetic input unless explicitly invoked with `--allow-synthetic`; outputs then say **SYNTHETIC SOFTWARE TEST — NOT HUMAN FINDINGS**.

## Privacy and public GitHub

Publish these empty materials and source code. Keep `research/local_data/` and `research/output/` out of Git. Do not upload names, student rolls, phone numbers, emails, consent records, video, audio, passwords used by actual people, or individual observations to the public repository. Use anonymous IDs P001–P008. The program rejects extra columns and identifiers outside its anonymous format; this does not replace reviewing files before sharing them.

The observation schema deliberately has an issue category rather than free-text participant quotes. Keep any additional anonymous notes privately and remove identifying details. No recordings are required. Ask separately before recording if recordings are ever introduced. Keep any contact/consent records separately from observations, with restricted access. Tell participants how to request withdrawal and set a deletion date before starting sessions.

Use fictional application accounts only. The study does not require access to Premier University's real ERP or a student's real records.
