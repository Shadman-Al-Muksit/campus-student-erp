# Exploratory pilot protocol

Version 1.0. Prepared for the Campus ERP portfolio prototype. **Not yet conducted.**

## Question and comparison

Question: does an interactive academic-progress dashboard with predefined navigation help make it easier for students to understand progress and locate information than conventional summaries and menu navigation?

Compare two views of this application:

- **Basic:** textual academic summaries and ordinary navigation. Earned/remaining credits, requirement details, class routine, and demonstration admit card remain available.
- **Enhanced:** the same underlying capabilities, plus interactive charts, clickable completion bars, and the guided navigation helper.

The comparison evaluates the combined additions. It cannot identify the separate effect of charts, clickable bars, or the helper. It does not compare this prototype with the university's authenticated ERP.

The measured outcomes concern navigation and interpretation during short tasks. They do not measure learning gains, degree outcomes, or academic performance.

## Participants and conditions

Target eight consenting university students who are likely portal users. Use a convenience sample and report this limitation. Participation is voluntary. Explain that the software is being tested, not the participant. Do not collect a real student roll or academic record. If this is later submitted under a university course or research program, follow that program's participant-study requirements before recruitment.

Each person uses both views on the same device and in their preferred supported language. Use two fictional accounts with comparable task complexity and different values to reduce answer memorization. The facilitator signs into the assigned account normally; no impersonation or staff override is used.

| Anonymous ID | Order | First condition/profile | Second condition/profile |
| --- | --- | --- | --- |
| P001 | basic_first | basic / study_a | enhanced / study_b |
| P002 | enhanced_first | enhanced / study_a | basic / study_b |
| P003 | basic_first | basic / study_b | enhanced / study_a |
| P004 | enhanced_first | enhanced / study_b | basic / study_a |
| P005 | basic_first | basic / study_a | enhanced / study_b |
| P006 | enhanced_first | enhanced / study_a | basic / study_b |
| P007 | basic_first | basic / study_b | enhanced / study_a |
| P008 | enhanced_first | enhanced / study_b | basic / study_a |

Recruitment availability may produce fewer participants. Report the actual number and imbalance; do not create replacement observations. Keep the assignment table as the plan, not as evidence that sessions occurred.

## Preparation

1. Freeze the tested Git commit. Record its hash, browser version, screen size, device category, language, and session date privately with the study notes.
2. Start the backend, database, and frontend using the main README. Confirm both study accounts can log in.
3. Confirm both accounts have accessible routine and demonstration admit-card pages, meaningful completed/in-progress/remaining requirements, and equivalent navigation destinations. If a destination is broken, fix it before the pilot and record the new commit.
4. Rehearse the script with a colleague who is not included in the participant sample. Check the timing method and tasks. Do not include the rehearsal as an observation.
5. Privately write the answer key from each account's current records: earned credits, unearned credits, remaining requirements, first routine entry, and admit-card identity. Explain that **unearned credits = required minus earned**, while the donut's **remaining** category excludes credits currently in progress. Freeze the records throughout the round.
6. Copy the empty template to `research/local_data/observations.csv`. Keep the public template empty. Prepare an ordinary stopwatch; the application need not record browsing behavior.
7. Confirm that the participant understands the introduction and voluntarily consents. Keep contact/consent records separate from anonymous task observations.

## Session procedure

Allow approximately 25–35 minutes including introduction, two sets of tasks, a short break, and discussion. Actual duration is reported rather than treated as a requirement.

For each condition:

1. Log out. Use the assigned study account and select the assigned mode on the study page. Confirm the selected language. Return to the dashboard before each task and close any previously open helper or dialog.
2. Read the task goal without naming menu items or pointing at controls. The participant can use any available feature, including help in the enhanced view.
3. Begin timing after the task instruction is understood and the participant starts. Stop after a correct response/destination, an explicit stop, or 120 seconds.
4. Do not explain routes or correct answers while timing. If help is necessary to continue, record each navigation hint as an assist. Reading the task again without a hint is not an assist. Describe assistance consistently across conditions.
5. Validate correctness against the frozen answer key. Record success, assisted completion, failure, or timeout using the dictionary. Ask the ease rating after timing has stopped. Discuss difficulties after all timed tasks, so questions do not inflate the task time.
6. After four tasks, switch profile and view according to the assignment table. Keep the device and language unchanged.

Start an anonymous observation only after consent. If a participant withdraws permission for their data, remove their observations rather than marking them as failures. If they stop but permit retention, keep completed attempts and later use `--allow-incomplete`.

## Tasks and measurements

Four tasks per view: find earned/unearned credits, identify outstanding requirements, locate the routine and identify one class, and locate the demonstration admit card and identify its student/term. The bilingual script provides the exact participant wording.

Each task has a 120-second limit. Record time in seconds, navigation mistakes, assists, and ease from 1 (very difficult) to 5 (very easy). Record the most important issue category rather than personally identifying comments.

An error is an action that clearly moves away from the goal, such as opening the wrong destination and then returning. Exploring a legitimate path is not automatically an error. A standard helper response is part of the enhanced design, not a facilitator assist.

## Analysis and interpretation

The CLI validates the CSV before producing outputs. Report observed participant and attempt counts, missing observations, sequence balance, outcome counts, errors, assists, and ease ratings. Analyze only matched, unassisted, successful attempts for time differences. Keep failed/assisted/timed-out outcomes visible. Do not compare a quick failure with a successful completion as evidence of speed improvement.

The median matched time difference is enhanced minus basic in seconds. Multiple task pairs from one participant are related measurements; a count of task pairs is not the number of independent participants. Use descriptive results and observed usability problems. Do not run a significance test or claim causal or population-level effectiveness from this small pilot.

Report language, device, sample/recruitment limitations, profile differences, order/practice effects, assistance, and the bundled design. The pilot can suggest fixes and motivate a larger study. It does not prove a general improvement.

## Sources informing the method

- [GOV.UK: Using moderated usability testing](https://www.gov.uk/service-manual/user-research/using-moderated-usability-testing): task-based observation, neutral task goals, consistent session guides, and prototype testing.
- [GOV.UK: Plan user research for your service](https://www.gov.uk/service-manual/user-research/plan-user-research-for-your-service): define research questions and recruit a small round of likely users. Small usability rounds serve a different purpose from large benchmarking studies.
- [NIST: Usability Testing](https://www.nist.gov/programs-projects/usability-testing): representative tasks, completion, time, errors, and participant feedback.

The assignment schedule, schema, two-minute task limit, and analysis choices are this project's protocol decisions. They are not requirements imposed by those sources.
