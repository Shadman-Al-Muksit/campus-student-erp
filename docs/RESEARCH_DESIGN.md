# Why the dashboard and helper are being evaluated

**Research status: protocol and analysis prepared; participant study not yet conducted.**

The portfolio includes an exploratory usability component. An interactive chart is a product feature. A research contribution requires a clear question, a stated method, observations, and an explanation of what those observations can and cannot establish.

Our question is whether interactive progress displays and a limited navigation helper make academic information easier to interpret and find in this prototype. The [study protocol](../research/PROTOCOL.md) compares basic and enhanced views of our own app using two fictional profiles. It does not assess the private university ERP or claim to replace its official records.

## Design rationale

- Credit and course completion answer different questions. A three-credit course and a one-credit lab have equal course counts but different credit weights. Both indicators expose their counts and denominator and open the underlying requirements.
- Degree progress uses the student's curriculum version. Passing a course twice cannot satisfy the same requirement twice. Every catalogue elective is not a requirement.
- The credit chart separates earned, active and remaining credits. A text breakdown explains that total unearned credits include active courses.
- Attendance charts refer to recorded held classes. Cancelled sessions and excused absences follow the documented demonstration policy.
- GPA uses published results. A chart is absent when too few semesters exist to show a trend.
- The help widget answers approved navigation questions. A direct link accompanies the menu path. Unknown questions show supported topics. This bounded behavior can be checked without a generative model.
- Basic and enhanced views retain the same information and destinations. The study examines presentation and guidance, rather than testing an interface that hides the answers.
- English and Bangla support includes instructions, labels and help. The participant keeps one chosen language across both views.

Charts need equivalent readable information. W3C's [complex-image guidance](https://www.w3.org/WAI/tutorials/images/complex/) supports short chart descriptions and access to detailed textual information. The implementation therefore includes labels and detail tables, with navigation possible by keyboard as well as by selecting chart elements.

## Evidence and outputs

The [research folder](../research/README.md) includes a bilingual script, consent checklist, empty observation template, strict data dictionary, tested analysis code and pending report template. NIST's [usability guidance](https://www.nist.gov/programs-projects/usability-testing) informs recording success, time, errors and feedback. GOV.UK's [moderated-testing guidance](https://www.gov.uk/service-manual/user-research/using-moderated-usability-testing) informs neutral tasks and a consistent session guide.

Eight volunteers are a planned exploratory round. They are not an achieved sample or a statistical power calculation. Testing the combination cannot establish the individual effect of the charts or helper. Actual sessions and an honest interpretation remain necessary before claiming usability findings.

The public repository contains preparation and software tests. Keep real observations private by default. Synthetic test records verify software behavior and must never be presented as participant findings.
