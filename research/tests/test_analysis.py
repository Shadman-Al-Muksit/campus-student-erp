"""Synthetic fixtures validate software only; they are not participant observations."""

import csv
import importlib.util
import tempfile
import unittest
from pathlib import Path

MODULE_PATH = Path(__file__).parents[1] / "analyze.py"
spec = importlib.util.spec_from_file_location("research_analysis", MODULE_PATH)
analysis = importlib.util.module_from_spec(spec)
spec.loader.exec_module(analysis)


def synthetic_rows():
    rows = []
    for participant in range(1, 9):
        basic_first = participant % 2 == 1
        first_profile = "study_a" if participant % 4 in (1, 2) else "study_b"
        for sequence in (1, 2):
            mode = "basic" if basic_first == (sequence == 1) else "enhanced"
            profile = first_profile if sequence == 1 else ("study_b" if first_profile == "study_a" else "study_a")
            for task in analysis.TASKS:
                rows.append(dict(zip(analysis.FIELDS, (
                    "synthetic", f"P{participant:03d}", "yes", "en", "desktop",
                    "basic_first" if basic_first else "enhanced_first", str(sequence), mode, profile,
                    task, "success", "40" if mode == "basic" else "30", "0", "0", "4", "none",
                ))))
    return rows


class ValidationTests(unittest.TestCase):
    def validate(self, rows, **kwargs):
        return analysis.validate_rows(rows, allow_synthetic=True, **kwargs)

    def test_balanced_complete_design_is_accepted(self):
        rows, warnings = self.validate(synthetic_rows())
        self.assertEqual(len(rows), 64)
        self.assertEqual(warnings, [])

    def test_empty_template_is_not_research(self):
        with self.assertRaisesRegex(analysis.StudyDataError, "No observations"):
            self.validate([])

    def test_synthetic_data_needs_explicit_test_flag(self):
        with self.assertRaisesRegex(analysis.StudyDataError, "Synthetic"):
            analysis.validate_rows(synthetic_rows())

    def test_name_email_or_roll_rejected(self):
        for identity in ("Aarif", "student@example.com", "2026001"):
            rows = synthetic_rows()
            rows[0]["participant_id"] = identity
            with self.assertRaisesRegex(analysis.StudyDataError, "anonymous"):
                self.validate(rows)

    def test_extra_personal_column_rejected(self):
        rows = synthetic_rows()
        rows[0]["email"] = "person@example.com"
        with self.assertRaisesRegex(analysis.StudyDataError, "columns"):
            self.validate(rows)

    def test_nonconsenting_record_rejected(self):
        rows = synthetic_rows()
        rows[0]["consented"] = "no"
        with self.assertRaisesRegex(analysis.StudyDataError, "consented"):
            self.validate(rows)

    def test_success_with_assistance_is_rejected(self):
        rows = synthetic_rows()
        rows[0]["assists"] = "1"
        with self.assertRaisesRegex(analysis.StudyDataError, "unassisted"):
            self.validate(rows)

    def test_assisted_without_help_is_rejected(self):
        rows = synthetic_rows()
        rows[0]["outcome"] = "assisted"
        with self.assertRaisesRegex(analysis.StudyDataError, "assist"):
            self.validate(rows)

    def test_invalid_numeric_values_rejected(self):
        for field, value in (("seconds", "NaN"), ("seconds", "inf"), ("seconds", "121"), ("seconds", "-1"), ("errors", "-1"), ("ease", "6"), ("assists", "0.5")):
            rows = synthetic_rows()
            rows[0][field] = value
            with self.subTest(field=field, value=value), self.assertRaises(analysis.StudyDataError):
                self.validate(rows)

    def test_timeout_at_wrong_time_rejected(self):
        rows = synthetic_rows()
        rows[0]["outcome"] = "timeout"
        with self.assertRaisesRegex(analysis.StudyDataError, "120"):
            self.validate(rows)

    def test_duplicate_task_rejected(self):
        rows = synthetic_rows()
        rows.append(rows[0].copy())
        with self.assertRaisesRegex(analysis.StudyDataError, "duplicate"):
            self.validate(rows)

    def test_language_device_order_consistency(self):
        for field, replacement in (("language", "bn"), ("device", "mobile")):
            rows = synthetic_rows()
            rows[0][field] = replacement
            with self.subTest(field=field), self.assertRaisesRegex(analysis.StudyDataError, "changed"):
                self.validate(rows)

    def test_mode_cannot_contradict_sequence(self):
        rows = synthetic_rows()
        rows[0]["mode"] = "enhanced"
        with self.assertRaisesRegex(analysis.StudyDataError, "contradicts"):
            self.validate(rows)

    def test_two_profiles_are_required(self):
        rows = synthetic_rows()
        for row in rows:
            if row["participant_id"] == "P001":
                row["profile"] = "study_a"
        with self.assertRaisesRegex(analysis.StudyDataError, "different fictional"):
            self.validate(rows)

    def test_partial_pilot_needs_opt_in_and_reports_missing(self):
        rows = synthetic_rows()[1:]
        with self.assertRaisesRegex(analysis.StudyDataError, "missing observation"):
            self.validate(rows)
        _, warnings = self.validate(rows, allow_incomplete=True)
        self.assertTrue(any("P001" in warning for warning in warnings))

    def test_mixed_observed_and_synthetic_refused(self):
        rows = synthetic_rows()
        rows[0]["record_type"] = "observed"
        with self.assertRaisesRegex(analysis.StudyDataError, "cannot be mixed"):
            self.validate(rows)

    def test_csv_header_and_empty_cli(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "empty.csv"
            path.write_text(",".join(analysis.FIELDS) + "\n", encoding="utf-8")
            output = Path(temp) / "output"
            self.assertEqual(analysis.main(["--input", str(path), "--output", str(output)]), 2)
            self.assertFalse(output.exists())


class AnalysisTests(unittest.TestCase):
    def test_failures_not_treated_as_fast_completions(self):
        rows = synthetic_rows()
        rows[4]["outcome"] = "failure"
        rows[4]["seconds"] = "1"
        normalized, warnings = analysis.validate_rows(rows, allow_synthetic=True)
        summary = analysis.summarize(normalized, warnings)
        self.assertEqual(summary["conditions"]["enhanced"]["outcomes"]["failure"], 1)
        self.assertEqual(summary["matched_unassisted_pairs"], 31)
        self.assertEqual(summary["median_matched_difference_seconds"], -10)
        self.assertEqual(summary["participant_pairs"][0]["unassisted_success_difference"], -.25)

    def test_output_labels_synthetic_and_preserves_existing_results(self):
        rows, warnings = analysis.validate_rows(synthetic_rows(), allow_synthetic=True)
        with tempfile.TemporaryDirectory() as temp:
            source = Path(temp) / "software_test.csv"
            with source.open("w", newline="", encoding="utf-8") as stream:
                writer = csv.DictWriter(stream, fieldnames=analysis.FIELDS)
                writer.writeheader()
                writer.writerows(rows)
            output = Path(temp) / "analysis"
            summary = analysis.summarize(rows, warnings)
            analysis.write_outputs(rows, summary, output, source)
            report = (output / "report.md").read_text(encoding="utf-8")
            self.assertIn("SYNTHETIC SOFTWARE TEST", report)
            self.assertIn("No participant study took place", report)
            self.assertTrue((output / "task_outcomes.png").exists())
            self.assertTrue((output / "matched_task_times.png").exists())
            self.assertTrue((output / "paired_participant_outcomes.csv").exists())
            with self.assertRaisesRegex(analysis.StudyDataError, "not empty"):
                analysis.write_outputs(rows, summary, output, source)


if __name__ == "__main__":
    unittest.main()
