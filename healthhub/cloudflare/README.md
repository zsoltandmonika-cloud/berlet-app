# HealthHub Central Vault on Cloudflare

The central HealthRadar source of truth is a single private JSON bundle in Cloudflare D1.

## Database
D1 database: `healthhub-vault`

Run `schema.sql` once in the D1 Console.

## Data model
- `healthhub_vault`: current Zsolt + Monika bundle
- `healthhub_vault_history`: previous versions / rollback
- `healthhub_audit`: import and update audit log

The current bundle contains both profiles:
```json
{
  "schemaVersion": "2.0",
  "profiles": {
    "zsolt": {},
    "monika": {}
  }
}
```

## Security
Do not put health data, API tokens, database credentials, Access tokens, or Worker secrets into the public GitHub repository.

The future Worker / Pages Function must be protected before any central health bundle is uploaded.
