# HealthHub Central Health Vault - Phase 3 setup

This folder contains the database schema for the private, synchronized HealthRadar data layer.

## Target architecture

HealthHub (GitHub Pages) -> Supabase Auth -> Postgres Health Vault

The public GitHub repository contains application code only. Personal HealthRadar data must not be committed to GitHub.

## One-time Supabase setup

1. Create a new Supabase project in an EU region.
2. Open SQL Editor and run `healthhub/central-vault/schema.sql`.
3. Enable Email authentication.
4. Sign in once so the HealthHub household owner exists in Authentication -> Users.
5. Copy that Auth user UUID.
6. Run the bootstrap SQL at the end of `schema.sql`, replacing `YOUR_AUTH_USER_UUID`.
7. Copy Project URL and the publishable/anon key from Project Settings -> API.
8. Put only those two browser-safe values into `healthhub/central-vault/config.js` and set `enabled: true`.
9. Never put the service_role key, database password, access tokens, or health data in GitHub.

## Data model

- one household
- two profiles: zsolt / monika
- items: record, medication, measurement, device, appointment, reference_document, cardiac_metric
- Row Level Security on all exposed data tables
- authenticated household members only
- localStorage becomes cache only, not the source of truth

## Migration package

The central import RPC accepts one JSON package containing both profiles:

```json
{
  "schemaVersion": "2.0",
  "profiles": {
    "zsolt": {
      "displayName": "Zsolt",
      "records": [],
      "medications": [],
      "measurements": [],
      "devices": [],
      "appointments": []
    },
    "monika": {
      "displayName": "Mónika",
      "records": [],
      "medications": [],
      "measurements": [],
      "devices": [],
      "appointments": []
    }
  }
}
```

The existing v1.1 private migration bundle is structurally compatible, but it is not the final seed because the complete legacy document index still has to be reconciled before central migration.

## Security rules

- no unauthenticated health-data access
- RLS is mandatory
- service_role never goes to browser code
- use EU data residency
- keep a separate encrypted export/backup
