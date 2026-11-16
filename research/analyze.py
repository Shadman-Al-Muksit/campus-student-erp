"""Validate and describe the exploratory Campus ERP pilot, without inventing findings.

The template contains headers only. Real observations remain local by default.
Synthetic input requires --allow-synthetic and every output is labelled accordingly.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import math
import re
import statistics
import sys
from collections import Counter, defaultdict
from pathlib import Path

FIELDS = (
    "record_type", "participant_id", "consented", "language", "device", "order",
    "sequence", "mode", "profile", "task_id", "outcome", "seconds", "errors",
    "assists", "ease", "issue_code",
)
TASKS = ("credits", "remaining_courses", "routine", "admit_card")
MODES = ("basic", "enhanced")
OUTCOMES = ("success", "assisted", "failure", "timeout")
ISSUES = {"none", "navigation", "terminology", "progress", "language", "layout", "helper", "document", "other"}


class StudyDataError(ValueError):
    """Input does not meet the documented observation contract."""


def _integer(value: str, label: str, minimum: int, maximum: int | None = None) -> int:
    if not re.fullmatch(r"\d+", value):
        raise StudyDataError(f"{label} must be a whole number.")
    result = int(value)
    if result < minimum or (maximum is not None and result > maximum):
        raise StudyDataError(f"{label} is outside its allowed range.")
    return result


def validate_rows(rows: list[dict], *, allow_incomplete: bool = False, allow_synthetic: bool = False) -> tuple[list[dict], list[str]]:
    """Return normalized rows; never substitute zero for missing observations."""
    if not rows:
        raise StudyDataError("No observations: the template is empty. Collect consenting volunteer sessions before analysis.")
    normalized, seen = [], set()
    allowed = {
        "record_type": {"observed", "synthetic"}, "consented": {"yes"},
        "language": {"en", "bn"}, "device": {"desktop", "mobile", "tablet"},
        "order": {"basic_first", "enhanced_first"}, "mode": set(MODES),
        "profile": {"study_a", "study_b"}, "task_id": set(TASKS),
        "outcome": set(OUTCOMES), "issue_code": ISSUES,
    }
    for number, original in enumerate(rows, start=2):
        if set(original) != set(FIELDS):
            raise StudyDataError(f"CSV row {number}: columns must exactly match the documented template.")
        row = {key: str(value).strip() if value is not None else "" for key, value in original.items()}
        if any(not value for value in row.values()):
            raise StudyDataError(f"CSV row {number}: missing value; omit an unattempted task rather than filling it with zeros.")
        if not re.fullmatch(r"P\d{3}", row["participant_id"]):
            raise StudyDataError(f"CSV row {number}: use an anonymous ID such as P001, never a name, roll, email, or phone.")
        for key, values in allowed.items():
            if row[key] not in values:
                raise StudyDataError(f"CSV row {number}: unsupported {key}; see DATA_DICTIONARY.md.")
        if row["record_type"] == "synthetic" and not allow_synthetic:
            raise StudyDataError("Synthetic software-test input refused. Use --allow-synthetic only for testing; it is not a human study.")
        row["sequence"] = _integer(row["sequence"], "sequence", 1, 2)
        row["errors"] = _integer(row["errors"], "errors", 0)
        row["assists"] = _integer(row["assists"], "assists", 0)
        row["ease"] = _integer(row["ease"], "ease", 1, 5)
        try:
            row["seconds"] = float(row["seconds"])
        except ValueError as exc:
            raise StudyDataError(f"CSV row {number}: seconds must be numeric.") from exc
        if not math.isfinite(row["seconds"]) or not 0 <= row["seconds"] <= 120:
            raise StudyDataError(f"CSV row {number}: seconds must be finite and between 0 and 120.")
        if row["outcome"] == "timeout" and row["seconds"] != 120:
            raise StudyDataError(f"CSV row {number}: a timeout is recorded at 120 seconds.")
        if row["outcome"] == "success" and row["assists"] != 0:
            raise StudyDataError(f"CSV row {number}: success means unassisted; use assisted when help was given.")
        if row["outcome"] == "assisted" and row["assists"] < 1:
            raise StudyDataError(f"CSV row {number}: assisted completion needs at least one assist.")
        expected = "basic" if (row["order"] == "basic_first") == (row["sequence"] == 1) else "enhanced"
        if row["mode"] != expected:
            raise StudyDataError(f"CSV row {number}: mode contradicts order and sequence.")
        identity = (row["participant_id"], row["mode"], row["task_id"])
        if identity in seen:
            raise StudyDataError(f"CSV row {number}: duplicate participant/mode/task observation.")
        seen.add(identity)
        normalized.append(row)
    if len({row["record_type"] for row in normalized}) != 1:
        raise StudyDataError("Observed and synthetic rows cannot be mixed.")

    participants = defaultdict(list)
    for row in normalized:
        participants[row["participant_id"]].append(row)
    warnings = []
    for participant, records in participants.items():
        for field in ("language", "device", "order"):
            if len({row[field] for row in records}) != 1:
                raise StudyDataError(f"{participant}: {field} changed between conditions.")
        assignments = {}
        for mode in MODES:
            profiles = {row["profile"] for row in records if row["mode"] == mode}
            if len(profiles) > 1:
                raise StudyDataError(f"{participant}: a condition must use one fictional profile.")
            if profiles:
                assignments[mode] = next(iter(profiles))
        if len(assignments) == 2 and len(set(assignments.values())) != 2:
            raise StudyDataError(f"{participant}: use different fictional profiles across the two conditions.")
        missing = [f"{mode}/{task}" for mode in MODES for task in TASKS if (participant, mode, task) not in seen]
        if missing:
            message = f"{participant}: {len(missing)} missing observation(s): {', '.join(missing)}."
            if not allow_incomplete:
                raise StudyDataError(message + " Use --allow-incomplete only to report a partial pilot explicitly.")
            warnings.append(message)
    if len(participants) != 8:
        warnings.append(f"Observed participant count is {len(participants)}; planned target is 8.")
    order_counts = Counter(records[0]["order"] for records in participants.values())
    if order_counts["basic_first"] != order_counts["enhanced_first"]:
        warnings.append("Interface order is unbalanced; practice and order effects may affect the comparison.")
    first_profiles = Counter(next((r["profile"] for r in records if r["sequence"] == 1), "missing") for records in participants.values())
    if first_profiles["study_a"] != first_profiles["study_b"]:
        warnings.append("First-profile order is unbalanced; profile differences may affect the comparison.")
    return normalized, warnings


def read_observations(path: Path, **options) -> tuple[list[dict], list[str]]:
    with path.open(encoding="utf-8-sig", newline="") as stream:
        reader = csv.DictReader(stream)
        if reader.fieldnames is None or len(reader.fieldnames) != len(FIELDS) or set(reader.fieldnames) != set(FIELDS):
            raise StudyDataError("CSV columns must exactly match observations_template.csv; personal-data or extra columns are not accepted.")
        return validate_rows(list(reader), **options)


def summarize(rows: list[dict], warnings: list[str]) -> dict:
    """Descriptive summaries only; task-time pairs require success in both views."""
    import pandas as pd

    frame = pd.DataFrame(rows)
    participants = sorted(frame.participant_id.unique())
    summary = {
        "record_type": rows[0]["record_type"], "participants": len(participants),
        "observations": len(rows), "planned_participants": 8,
        "complete_participants": sum(len(frame[frame.participant_id == p]) == 8 for p in participants),
        "warnings": warnings, "conditions": {}, "tasks": {}, "paired_times": [], "participant_pairs": [],
    }
    for mode in MODES:
        subset = frame[frame["mode"] == mode]
        counts = {outcome: int((subset.outcome == outcome).sum()) for outcome in OUTCOMES}
        summary["conditions"][mode] = {
            "attempts": len(subset), "outcomes": counts,
            "unassisted_success_rate": counts["success"] / len(subset) if len(subset) else None,
            "errors": int(subset.errors.sum()), "assists": int(subset.assists.sum()),
            "median_ease": float(subset.ease.median()) if len(subset) else None,
        }
        for task in TASKS:
            task_rows = subset[subset.task_id == task]
            summary["tasks"][f"{mode}/{task}"] = {
                "attempts": len(task_rows),
                "outcomes": {outcome: int((task_rows.outcome == outcome).sum()) for outcome in OUTCOMES},
            }
    lookup = {(r["participant_id"], r["mode"], r["task_id"]): r for r in rows}
    for participant in participants:
        records = frame[frame.participant_id == participant]
        if len(records) == 8:
            pair = {"participant_id": participant}
            for mode in MODES:
                condition = records[records["mode"] == mode]
                pair[f"{mode}_successes"] = int((condition.outcome == "success").sum())
                pair[f"{mode}_errors"] = int(condition.errors.sum())
                pair[f"{mode}_assists"] = int(condition.assists.sum())
                pair[f"{mode}_median_ease"] = float(condition.ease.median())
            pair["unassisted_success_difference"] = (pair["enhanced_successes"] - pair["basic_successes"]) / 4
            summary["participant_pairs"].append(pair)
        for task in TASKS:
            basic, enhanced = lookup.get((participant, "basic", task)), lookup.get((participant, "enhanced", task))
            if basic and enhanced and basic["outcome"] == enhanced["outcome"] == "success":
                summary["paired_times"].append({
                    "participant_id": participant, "task_id": task,
                    "basic_seconds": basic["seconds"], "enhanced_seconds": enhanced["seconds"],
                    "difference_seconds": enhanced["seconds"] - basic["seconds"],
                })
    differences = [r["difference_seconds"] for r in summary["paired_times"]]
    summary["matched_unassisted_pairs"] = len(differences)
    summary["median_matched_difference_seconds"] = statistics.median(differences) if differences else None
    return summary


def write_outputs(rows: list[dict], summary: dict, output: Path, input_path: Path) -> None:
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    import pandas as pd

    if output.exists() and any(output.iterdir()):
        raise StudyDataError("Output directory is not empty. Choose a new directory to preserve previous results.")
    output.mkdir(parents=True, exist_ok=True)
    summary["input_sha256"] = hashlib.sha256(input_path.read_bytes()).hexdigest()
    summary["input_file"] = input_path.name
    synthetic = summary["record_type"] == "synthetic"
    label = "SYNTHETIC SOFTWARE TEST — NOT HUMAN FINDINGS" if synthetic else "Exploratory pilot observations"
    (output / "summary.json").write_text(json.dumps(summary, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    pd.DataFrame(summary["paired_times"], columns=["participant_id", "task_id", "basic_seconds", "enhanced_seconds", "difference_seconds"]).to_csv(output / "matched_task_times.csv", index=False)
    pd.DataFrame(summary["participant_pairs"], columns=[
        "participant_id", "basic_successes", "basic_errors", "basic_assists", "basic_median_ease",
        "enhanced_successes", "enhanced_errors", "enhanced_assists", "enhanced_median_ease",
        "unassisted_success_difference",
    ]).to_csv(output / "paired_participant_outcomes.csv", index=False)

    colors = {"success": "#107d70", "assisted": "#7db7ae", "failure": "#d98539", "timeout": "#b54b5a"}
    fig, ax = plt.subplots(figsize=(7, 4.5))
    bottoms = [0, 0]
    for outcome in OUTCOMES:
        values = [summary["conditions"][mode]["outcomes"][outcome] for mode in MODES]
        ax.bar(MODES, values, bottom=bottoms, label=outcome, color=colors[outcome])
        bottoms = [a + b for a, b in zip(bottoms, values)]
    ax.set_ylabel("Recorded task attempts")
    ax.set_title("Task outcomes by interface")
    ax.legend(title="Outcome", bbox_to_anchor=(1.02, 1), loc="upper left")
    fig.text(0.01, 0.01, label, fontsize=8)
    fig.tight_layout(rect=(0, .05, 1, 1))
    fig.savefig(output / "task_outcomes.png", dpi=180)
    plt.close(fig)
    if summary["paired_times"]:
        fig, ax = plt.subplots(figsize=(7, 4.5))
        for pair in summary["paired_times"]:
            ax.plot([0, 1], [pair["basic_seconds"], pair["enhanced_seconds"]], marker="o", color="#107d70", alpha=.45)
        ax.set_xticks([0, 1], MODES)
        ax.set_ylabel("Seconds (both attempts unassisted and successful)")
        ax.set_ylim(0, 125)
        ax.set_title(f"Matched task times: {summary['matched_unassisted_pairs']} pairs")
        fig.text(0.01, 0.01, label, fontsize=8)
        fig.tight_layout(rect=(0, .05, 1, 1))
        fig.savefig(output / "matched_task_times.png", dpi=180)
        plt.close(fig)

    report = [f"# {label}", "", "## Dataset", "",
              f"Participants: {summary['participants']} (planned: 8). Recorded attempts: {summary['observations']}.",
              f"Participants with all eight attempts: {summary['complete_participants']}.",
              f"Input SHA-256: `{summary['input_sha256']}`.", "",
              "## Recorded outcomes", "", "| Interface | Attempts | Unassisted | Assisted | Failure | Timeout | Median ease (1–5) |",
              "| --- | ---: | ---: | ---: | ---: | ---: | ---: |"]
    for mode in MODES:
        condition = summary["conditions"][mode]
        counts = condition["outcomes"]
        ease = "unavailable" if condition["median_ease"] is None else str(condition["median_ease"])
        report.append(f"| {mode} | {condition['attempts']} | {counts['success']} | {counts['assisted']} | {counts['failure']} | {counts['timeout']} | {ease} |")
    difference = summary["median_matched_difference_seconds"]
    report += ["", "## Matched completion times", "",
               f"Eligible task pairs: {summary['matched_unassisted_pairs']}. Both conditions must be successful without assistance.",
               "Median enhanced-minus-basic difference: " + (f"{difference:.2f} seconds." if difference is not None else "unavailable; no eligible pairs."),
               "A negative difference means shorter time for enhanced among these matched successes only. Failed, assisted and timed-out attempts remain in the outcome counts above.",
               "Task pairs from one participant are related observations; the pair count is not an independent participant sample size.",
               "Per-participant paired outcomes for complete sessions are available in paired_participant_outcomes.csv. Incomplete sessions remain in the observed outcome counts and missingness warnings.",
               "", "## Warnings and limits", ""]
    report += [f"- {warning}" for warning in summary["warnings"]] or ["- No structural completeness or balance warning."]
    report += ["- This small convenience pilot is exploratory. It cannot establish university-wide effectiveness or statistical generalization.",
               "- The enhanced view combines charts and guided help. Their individual effects are not isolated.",
               "- Fictional profiles, practice, sequence, language, device and facilitator effects may affect outcomes.",
               "- Summaries are descriptive. There is no significance test, causal-effect estimate, or graduation/academic-performance claim.",
               "", "## Interpretation and changes", "",
               "Pending human review: explain observed difficulties, record evidence-linked interface changes, and rerun affected tasks. Do not replace this section with a claim of improvement unless the observations support it.", ""]
    if synthetic:
        report += ["These are synthetic software-test records. No participant study took place for this output.", ""]
    (output / "report.md").write_text("\n".join(report), encoding="utf-8")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, required=True, help="Consented anonymous observations CSV")
    parser.add_argument("--output", type=Path, required=True, help="New or empty output directory")
    parser.add_argument("--allow-incomplete", action="store_true", help="Report partial data and explicit missing-observation warnings")
    parser.add_argument("--allow-synthetic", action="store_true", help="SOFTWARE TEST ONLY: label every output as synthetic")
    args = parser.parse_args(argv)
    try:
        rows, warnings = read_observations(args.input, allow_incomplete=args.allow_incomplete, allow_synthetic=args.allow_synthetic)
        summary = summarize(rows, warnings)
        write_outputs(rows, summary, args.output, args.input)
    except (StudyDataError, OSError, ImportError) as exc:
        print(f"Analysis not completed: {exc}", file=sys.stderr)
        return 2
    print(f"Wrote {summary['record_type']} descriptive analysis to {args.output}. Participants: {summary['participants']}; matched successful task pairs: {summary['matched_unassisted_pairs']}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
