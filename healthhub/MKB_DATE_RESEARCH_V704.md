# MKB Clinical Date Search QA v704 (2026-10-19)

## Evidence-based trigger
Real user report: Asked "Mi történt Mónikával 2024 június 17-én?" and Ask Léna returned **0 original PDF excerpts**, **0 MKB source grants**, 4 prior JSON explanations. This is a **search/consent integration miss**, not evidence that original documents are absent.

## Database verification (internal admin-only)
Verified patient-profile PDF documents with names beginning `2024-06-17`, including cardiology and hospital discharge reports. Follow-on records also present. Several duplicated titles exist and may have independent records. SOURCE `original_observed_at` timestamps are from October 2026 uploads and **do not prove the historical event date**.

## Minimal reversible changes
- Detect Hungarian and ISO dates in a question. Match exact date prefixes in original verified PDF file names and rank them ahead of other same-year sources.
- Select a literal SHA-checked PDF excerpt near a clinically relevant narrative heading, not automatically the letterhead; keep five approved excerpts max.
- Differentiate file-name date from the original event date in UI and AI context; do not fabricate timelines.
- Require the explicit question-specific one-time source approval (MKB grant consumed during `run`) for the v703 preview route, not only existing profile-wide PDF consent.
- Personal dated-event questions without original source content now fail closed with instructions for `Forrásolt orvosi tudás`.
- Reuse the same Supabase preview endpoint. No change to production `smooth-endpoint-v395` or medical source files.

## Acceptance
1. Open `https://zsoltandmonika-cloud.github.io/berlet-app/healthhub/?hhMkbQA=v1`, authenticate, select Mónika.
2. Ask `Mi történt Mónikával 2024. június 17-én?`, click `Forrásolt orvosi tudás`.
3. Verify a 2024-06-17 original PDF appears **before approval**; inspect the actual excerpt and document/page.
4. Press `Kutatás indítása a kiválasztott forrásokkal` to approve this request exactly once.
5. Expect log: `I-09: N külön engedélyezett`, `MKB QA v1`, `I-04 ... N eredeti PDF-kivonat` with N > 0 and meaningful source-bound narrative.
6. Verify simple 'Kutatás' without one-time PDF approval cannot produce an invented first-person historical medical story; verify no wrong-profile pages and no hidden transmission.

## Labels
- `CODED` = GitHub code; `TESTED` = synthetic automatic regressions; `DEPLOYED` = merged main; `LIVE VERIFIED` = authenticated response with actual PDFs; `USER ACCEPTED` = user confirms usability.
- Not claim LIVE VERIFIED from CI or SQL tests.

## Rollback
Revert GitHub v704 commit(s) or use normal application URL without `?hhMkbQA=v1`. Do not remove or rewrite medical records.
