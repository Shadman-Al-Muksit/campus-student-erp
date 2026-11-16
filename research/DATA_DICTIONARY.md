# Observation data dictionary

One CSV row represents **one actual task attempt by one consenting anonymous participant in one interface condition**. The public template has headers only. Keep observations in ignored private storage. Use UTF-8, comma separators and a dot for decimal seconds. Do not add names, real roll numbers, contact details, or free-text quotes.

| Column | Allowed value | Meaning |
| --- | --- | --- |
| record_type | `observed` or `synthetic` | `observed` only for real sessions. Synthetic input is refused by default and never supports human findings. |
| participant_id | `P001` to `P999` | Anonymous study ID. The planned first round uses P001–P008. |
| consented | `yes` | Confirmed informed consent. Withdrawn observations must be removed. |
| language | `en` or `bn` | Chosen interface/script language, constant across both conditions. |
| device | `desktop`, `mobile`, `tablet` | Device category, constant across both conditions. |
| order | `basic_first` or `enhanced_first` | Assigned view order, constant for the participant. |
| sequence | `1` or `2` | First or second condition in this session. |
| mode | `basic` or `enhanced` | Must agree with sequence and order. |
| profile | `study_a` or `study_b` | Fictional account; one account per condition and different accounts across conditions. |
| task_id | `credits`, `remaining_courses`, `routine`, `admit_card` | The script's task identifier. |
| outcome | `success`, `assisted`, `failure`, `timeout` | Mutually exclusive task result, defined below. |
| seconds | Number from 0 through 120 | Stopwatch duration to correct completion, explicit stop, or time limit. A timeout must equal 120. |
| errors | Whole number, 0 or greater | Clearly wrong navigation actions. Legitimate exploration is not automatically an error. |
| assists | Whole number, 0 or greater | Facilitator hints. Using the built-in navigation helper is not an assist. |
| ease | Whole number, 1–5 | Post-task rating. 1 = very difficult; 5 = very easy. |
| issue_code | `none`, `navigation`, `terminology`, `progress`, `language`, `layout`, `helper`, `document`, `other` | Most important observed issue. Additional anonymous notes stay private. |

## Outcomes

- `success`: correct answer/destination within the limit without facilitator hints. `assists` must be 0.
- `assisted`: correct completion within the limit with at least one facilitator hint. `assists` must be at least 1.
- `failure`: participant stops or concludes with an incorrect response before the time limit. Record actual elapsed seconds.
- `timeout`: task remains incomplete or incorrect at 120 seconds. Record 120, even if the participant later completes during discussion.

Time starts when the instruction is understood and the participant begins. Stop timing before ease ratings and discussion. Do not replace missing observations with zeros or set a failed attempt's time to the successful time observed in another condition.

## Completeness and pairing

The planned complete dataset has 8 participants × 2 views × 4 tasks = 64 rows. Participant/mode/task is unique. No rows should appear for unattempted tasks. Both conditions must keep the same language, device and assigned order. A repeated task in the same condition is a new round, not another row in this file.

Default analysis requires all eight task attempts per included participant. `--allow-incomplete` explicitly permits a partial round and reports missing observations. It never infers the missing outcome. The target count of eight is reported but does not authorize fabricating records if recruitment stops early.

Time comparisons use the same participant and task in both views, with both outcomes `success`. Assisted completions, failures, and timeouts stay visible in outcome counts but are excluded from matched-success time differences. Report how many pairs remain. A participant who succeeds in one view and fails in the other still contributes those actual outcomes.

The CLI accepts only this exact schema. Anonymous IDs and no free-text columns reduce accidental identification but cannot guarantee anonymity of every future file. Review all data and reports before sharing. Raw observations are not approved for publication merely because the repository is public.
