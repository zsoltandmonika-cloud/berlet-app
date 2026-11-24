# SHO Smart Notes

Status: approved scope, isolated development branch; not deployed.

## UX
Golden Standard dark glassy, mobile-first S24 Ultra; notebooks with editable titles, separate titled notes, rich text, checklists, attachments, search, tags, shared/private visibility, autosave. Initial optional notebooks: SHO Deficit List, Bug List, Fejlesztési javaslatok. Notes never automatically become tasks.

## Integration
Existing Family Tasks at `/berlet-app/sh9/family-hub/` remains the sole task authority. Global Tasks quick menu and Family Tasks page offer Smart Notes, new note, attach existing note. Notes offer create task or attach to existing task; full note or selected excerpt. Many-to-many links, stable IDs, no duplicate copies, task completion never deletes notes. Assignee Zsolt/Mónika/Léna through existing supported task mechanisms; AI assignment is not execution confirmation. Preserve existing profile/auth controls.

## Data and safety
Inspect existing Family Tasks schema/auth before migration. Add separate notebooks, notes and note-task link tables with authenticated RLS, enforce private/shared visibility on every read and link; do not trust profile selector as identity. Offline cache scoped to authenticated identity; purge on sign-out; pending edits with conflict detection, no silent overwrite. Attachments private, no public storage. Include new data in backup/restore validation. No production migration or deployment before isolated tests and verified recovery path.

## Acceptance
Create/edit/rename/delete/archive notebooks and notes; save/reload; two-device sync; offline edit/reconnect/conflict; private access denial; shared access; both navigation entry points; multiple links in both directions; selected excerpt; task completion and unlink preserve note; existing Tasks regression; mobile visual QA; backup restore. No separate APK required.
