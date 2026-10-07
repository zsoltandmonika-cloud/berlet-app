# HealthHub v300 — Continuous AI Improvement Engine

## Milestone
v300 introduces the first self-checking and continuously improving operating layer for HealthHub.

## v300 scope
- Admin Console only.
- System Health Check with GREEN / AMBER / RED status.
- Real operational signals only: runtime errors/warnings, load timing, long tasks, connectivity and storage estimate.
- Lightweight local-first telemetry. No clinical values are collected.
- Improvement suggestions derived from measured signals.
- Wishlist / User Story Repository for Zsolt, Mónika and AI-originated ideas.
- Preliminary impact, complexity and feasibility classification.
- Ask Léna handoff for deeper Product Owner / Solution Architect analysis.
- Level 3 remediation gate displayed in the Admin Console.

## Safety model
Observe → Diagnose → Recommend → Approve → Backup → Remediate → Test → Deploy → Measure.

No production change is allowed by the Level 3 design without explicit approval and a recoverable restore point.

## Telemetry guardrail
HealthHub functionality always has priority over telemetry. Telemetry is asynchronous, locally aggregated and disposable if it would create measurable user-experience degradation.

## Initial Wishlist
WISH-001 through WISH-010 are seeded, including System Health, backup/rollback, self-remediation, Central Manual Sync, All Profiles / All Devices Sync, Scheduled Sync Orchestrator and AI Backlog Prioritization.

## Rollback
Pre-v300 baseline: branch `backup-healthhub-v299-20261007`.
