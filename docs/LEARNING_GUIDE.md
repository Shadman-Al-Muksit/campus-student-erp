# Understanding the Campus ERP

This guide explains how the working parts fit together. Start the application using the [main README](../README.md), then follow one action at a time. You do not need to understand every library before you can trace a request.

## 1. The three main parts

The **frontend** is the React interface in your browser. It displays information, checks basic form input and sends requests. TypeScript describes the expected shapes of data. Vite runs the development interface and creates its production files. React Router chooses a page from the URL. TanStack Query loads server data and refreshes it after a successful change.

The **backend** is Django plus Django REST Framework. It identifies the signed-in user, checks permission, applies academic rules, calculates summaries and reads or writes records. The frontend does not decide whether a student is allowed to see a record or occupy the last seat.

The **database** is PostgreSQL. It stores related records. Django's models describe those records in Python. A migration describes a database-structure change so that another computer can create the same tables. Migrations are source files; your local database contents are separate.

```text
Browser action → JSON request → Django checks → PostgreSQL
Browser display ← JSON response ← calculated/loaded records
```

## 2. Trace one registration

1. Sign in as a student and open the course catalogue. The browser requests `/api/v1/courses/`.
2. The backend finds the authenticated student's curriculum, prior published results, registrations and offered sections.
3. The response describes each offering, including credits, schedule and eligibility. The browser renders that response.
4. Request a section. The frontend sends `POST /api/v1/me/registrations/` with its offering ID and a CSRF token.
5. The backend checks the registration period, prerequisites, credit limit, duplicates and conflicts. It creates a pending request only when the rules permit it.
6. An administrator approves or rejects that request. Approval checks the rules again because availability may have changed since submission.
7. An approved registration appears in the student's routine. A rejected request does not create a timetable entry.

Open the browser's Developer Tools → Network to inspect these requests. Look at the URL, method, status code and response. Avoid copying session cookies into screenshots or public issues. For a failed request, read the response before guessing that the frontend is broken.

## 3. Course, offering and requirement are different

**Course:** a reusable catalogue subject, such as Database Systems.

**Offering:** one semester's section of that course, with its own teacher, capacity, room and timetable. Two offerings may refer to the same course.

**Curriculum requirement:** a rule the student must satisfy for their assigned degree version. A compulsory course can have one requirement. An elective slot can accept one of several courses. The list of all elective options is not the number of requirements a student must finish.

Keep these separate or a repeat course can inflate completion and an old student's denominator can change when next year's catalogue changes.

## 4. Understand percentages before charts

Credit completion = earned credits that satisfy curriculum requirements ÷ required credits × 100.

Course completion = completed course requirements ÷ required course requirements × 100.

For example, a **fictional** degree with 60 earned credits out of 120 displays 50%. That does not mean 50% of the course count is completed. Courses can have different credit values.

The credit donut divides required credits into earned, in-progress and remaining. Total **unearned** credits equal in-progress plus remaining. A current registration is not an earned credit. Published passing results count; draft or failing results do not. Missing curriculum data is unavailable, not zero.

Click the progress display, inspect the underlying rows, and compare the totals. The backend calculates both the summary and details. Recharts draws the numbers; it does not decide which credits count.

GPA is credit-weighted: sum of published course grade-points × course credits, divided by the corresponding attempted credits. A simple average of course GPAs gives a wrong result when credits differ. This prototype documents a demonstration policy and does not implement every university's retake rules.

## 5. Login, permission and CSRF

**Authentication** asks who is signed in. Django creates a session and the browser carries a session cookie.

**Authorization** asks whether that person may perform this action or read this record. A signed-in student must still be prevented from reading somebody else's fees. Hiding an administrator button is not authorization; the server must reject the request too.

**CSRF protection** helps stop another site from submitting a state-changing request using a signed-in browser's cookies. Login and write requests use the appropriate token. Keep browser and API under the same origin; the Vite proxy routes local `/api/` requests to Django during development.

Check a second student account when testing privacy. A page loading correctly for one student does not prove isolation.

## 6. English, Bangla and the helper

Interface text uses translation keys rather than scattered hardcoded sentences. A translation key points to an English and a Bangla value. Add both when creating a label, button, error or supported help question. Check long Bangla labels on a phone-width layout rather than shrinking them until they are unreadable.

Academic identifiers, user names and stored course data are not automatically translated by changing the interface language. Bilingual notices and course titles use the corresponding stored fields.

The navigation helper uses approved questions, keyword matching and shared application routes. It does not understand arbitrary conversations. Test supported, ambiguous and unknown inputs. A helpful answer must lead to a real, permitted page and explain unavailable documents.

## 7. Read the tests as examples

A useful test states an important behavior: a student cannot read another student's records; a pending registration does not occupy an approved seat; draft marks do not affect GPA; a requirement counts once.

Use the main README's test commands. Read a failing assertion together with the fixture setup. Ask what behavior changed before modifying the expected value. Changing a test to match broken output does not fix the application.

Backend tests check rules and response data. Playwright opens a browser to check a whole journey. Research tests check that the analysis rejects invalid observations and labels synthetic data correctly. Passing research-software tests does not mean a participant study happened.

## 8. Maintain the project safely

- Make a small change, run the affected checks, then inspect the result in both languages.
- Back up the database before migrations or bulk edits. A Git commit backs up source code, not PostgreSQL data.
- Keep local environment settings, database dumps and real participant files out of public Git.
- Add migrations when changing models. Do not manually edit database tables to avoid a migration.
- Reuse the backend calculations instead of adding independent GPA or progress formulas in a new chart.
- Keep notices, demonstration policies and the API contract aligned with actual behavior.
- Use the pending research report honestly: no volunteers or observations means no findings yet.

## Milestone walkthrough

Once the app runs, demonstrate these actions in order: sign in → inspect dashboard → open progress details → request an eligible offering → approve it as admin → inspect the student's timetable → check published results and fees → use the helper in both languages → compare basic and enhanced study views.

For each action, explain which screen sends a request, which server rule applies, which record changes, and which test checks it. That is the minimum understanding needed to present this as your portfolio project accurately.
