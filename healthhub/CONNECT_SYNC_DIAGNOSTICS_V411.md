# HealthHub Connect · automatic sync diagnostic contract (v411)

Status: IMPLEMENTATION SPECIFICATION ONLY. No Android APK change or device test is claimed.

## Problem statement
Mónika's Samsung Health daily activity reaches HealthHub with manual read/upload; automatic freshness is not confirmed. User reports battery optimization unrestricted for **both** HealthHub Connect and HH Samsung Beta. Do not presume a battery restriction root cause.

## Minimal instrumented lifecycle
Implement in the native collector(s), not in the web-only HealthHub page. Each distinct source+profile+device scheduled attempt has an opaque correlation ID and UTC timestamps.
1. `scheduled`: job enqueued; capture scheduler kind, next expected window and job ID
2. `started`: worker actually invoked; capture invocation trigger (periodic/manual/boot/foreground/retry), schedule latency and connectivity
3. `permission_checked`: Health Connect background read permission and Samsung SDK eligibility results separately, without secrets
4. `source_read`: source, query window, record_count, newest measurement timestamp; distinguish valid empty result and exception
5. `serialized`: schema version, safe byte count, integrity digest; do not log raw medical records
6. `queued_for_upload`: durable queue item ID and age; preserve on network failure
7. `uploaded`: Dropbox request result and destination pseudonymous identifier; never expose tokens
8. `cloud_verified`: read-after-write checksum/ack verification (if supported) and latest server observed time. Only now show end-to-end green.
9. `failed`: stage, stable error code, retryable flag, retry count, next retry time, with sensitive strings redacted.

Keep `last_attempt_at`, `last_started_at`, `last_source_read_at`, `last_successful_upload_at`, `last_cloud_verified_at`, `last_measurement_at` distinct. Export time is NOT a measurement timestamp. Explicitly mark stale data. Never report green for merely queued or launched work.

## Local bounded diagnostics and privacy
- Ring buffer of recent 100 events per profile/device, stored in encrypted app-private storage, retention 14 days or shorter configurable policy; safe summary upload opt-in.
- Fields: event_id, correlation_id, device alias, profile ID, source name, app_build, scheduler_type, trigger, stage, event_time_utc, relevant event duration, record_count, max_measurement_time_utc, queue_depth, retry_number, normalized error_code, verified flag.
- No name, birthdate, heart rate, steps per individual record, raw payload, access/refresh tokens, OAuth URLs or clinical data in diagnostic event bodies.
- Separate device-specific state to avoid attributing Zsolt measurements to Mónika.
- Emit events atomically; capture failures without terminating the collector.

## Scheduler investigation
- Verify the installed native source and runtime scheduler: WorkManager unique periodic work or demonstrably equivalent. Do not claim that a GitHub plan is an installed worker.
- Check constraints, periodic interval/flex, retry backoff, app standby, OS job delay, reboot/app-update rescheduling, network connectivity and Samsung SDK restrictions.
- A one-time manual sync must never silently enable periodic automatic sync.
- Check for duplicate jobs from two apps; ensure they do not write the same JSON as competing authorities.

## Admin Center proposal
Each profile/device displays the five timestamps separately, current source status (HC / Samsung), queued uploads, actual runs in last 24h, warning for missing scheduled start, error code and a **Request safe diagnostic** command. Differentiate phone-offline vs data-not-available vs failed upload. Never confuse a command accepted by cloud with a phone-executed command.

## Acceptance test on Mónika device
1. Record current local time and Samsung Health latest measurement; observe idle period spanning at least one genuine scheduler interval.
2. Verify a `scheduled` and later `started` event **without tapping a sync button**.
3. Verify Samsung query, local durable queue, Dropbox upload, cloud verification and HealthHub Activity freshness.
4. Repeat after screen-off, app swipe-away, intermittent Wi-Fi, and reboot, respecting OS scheduling variability.
5. Check stale/empty-source and 401/429/network failures: honest statuses, safe retry, no loss and no duplicate steps.
6. Compare timestamps and values across the Samsung Health source and HealthHub view with the correct profile.
7. Do not retire HH Samsung Beta before the unified Connect app passes manual and unattended parity.

## Blockers
- Native source directories/build projects for both currently installed APKs are not identified in the inspected GitHub repository.
- Can't assert Samsung SDK permissions/entitlements or Android runtime behavior until actual APK/source and on-phone run are inspected.

## Next action
Locate the two native Android projects or verified build artifacts and then implement these event hooks in their worker/collector/uploader classes. Deploy a signed beta separately and run the acceptance test before integrating into main.
