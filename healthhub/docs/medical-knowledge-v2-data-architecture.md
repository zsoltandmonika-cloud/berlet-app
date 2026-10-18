# HealthHub Medical Knowledge Base 2.0 · Phase A — private database foundation

## Current status (2026-10-18)
- **Schema only**. Does not import PDFs, JSON, images or start a background job.
- Existing production `hh_kb_documents`, `hh_kb_pages`, `hh_kb_visuals`, `hh_kb_search` stay in place and remain empty until authenticated ingestion.
- Never place private PDF, JSON or photographs in the public GitHub repository.
- New data is appended with profile-scoped, versioned source identity. Existing family medical data is not rewritten.
- Ask Léna is **not yet wired** to the new tables. Do not claim richer model answers until citation retrieval is integrated and tested.

## Data tables

| Table | Purpose | Required source and provenance |
| --- | --- | --- |
| `hh_mkb_sources` | Immutable provider/file version identity, kind PDF/JSON/photo, hash, pointer to original | `profile_key`, origin, origin reference and version |
| `hh_kb_documents` | Existing original PDF metadata, now optional `mkb_source_id` | Profile-checked FK to source |
| `hh_kb_pages` | Existing full-text PDF pages, OCR and per-page review flags | Document ID + page |
| `hh_kb_visuals` | Existing PDF-page PNG snapshots / EKG candidates | Document ID + page |
| `hh_mkb_json_records` | Parsed JSON value from a profile-specific original | Source ID + JSON Pointer |
| `hh_mkb_facts` | Typed diagnosis / lab / cardiac / medication / measurement / event / finding / symptom facts, uncertainty, original units | Source ID required for every fact |
| `hh_mkb_evidence` | 1..N exact citations for facts: file + PDF page / JSON Pointer / photo bounding box | Composite FK to fact and source scoped to same profile |
| `hh_mkb_image_annotations` | Unverified image labels and OCR/image regions, including consented Ask Léna photos | Source ID, classification, review status |
| `hh_mkb_ingest_jobs` | Queued / running / partial / failed / completed state for delta ingestion | Unique source + task, profile isolation |

Every extracted observation has provenance, precision, polarity and verification flags. **The AI output is never a verified clinical fact by default.** The system must preserve negative findings, contradictions, historic information and original data without normalizing them away.

## File retention
- Existing Drive/Dropbox originals stay where they are. The `origin_ref` points to the provider reference; never stores provider access tokens.
- A new private Supabase bucket `hh-mkb-originals` is available for *user-approved* copied files and photographs; storage access depends on the source catalog and profile.
- Ask Léna images are **ephemeral by default**. A persistent `hh_mkb_sources` row for `origin=ask_lena` and `source_kind=image` requires explicit `archive_consent_at`, so no implicit permanent retention. Session-only analysis must remain in the existing temporary request path, not the permanent knowledge base.
- A `sha256` check detects identical content; `source_version` preserves provider updates. Duplicate originals are never deleted automatically.

## Ingestion pipeline (next engineering phase)
1. Authenticated incremental inventory of existing HealthHub local documents and approved remote Dropbox/Drive folders, JSON sync objects and selected Ask Léna images. No manual download/upload workflow. Do **not** crawl all folders blindly. Use only explicitly authorized archives.
2. Verify profile, original file identity, MIME/signature, checksum and byte count. Create source + job, then retrieve the verified original via the approved provider API. Fail closed when permissions are absent.
3. PDF: PDF.js complete text pages; local OCR of scanned pages; record EKG/chart/images; no truncation marked complete. JSON: parse all fields, retain original values and nested JSON Pointers; schema-aware parsing for known collectors, with unknown fields preserved. Image: preserve unmodified image and store provisional region/text annotations separately.
4. Normalize *candidate* clinical facts while preserving source wording, units, original timestamps and explicit uncertainty; add one or more `hh_mkb_evidence` citations. High-risk results need human review.
5. Idempotent job execution / delta sync with safe retry and explicit per-source completion coverage.
6. Ask Léna retrieval: authorized profile-based fulltext + typed fact search, original PDF page / JSON field / image citation, refusal to invent missing evidence. Only explicitly consented question-time evidence may go to the AI.
7. End-to-end validation: first 4–5 mixed real documents, then the 160+ PDF backfill. Check exact byte/checksum match, page equality, source quotes, OCR review, duplication, cross-device access, zero wrong-profile reads and reliable resumability.

## Not done yet
- No background synchronizer installed in this phase.
- No PDF/JSON/photo data extracted or loaded.
- No Ask Léna read path to the v2 knowledge base.
- No photo ever auto-archived without a user action.

**Production go/no-go:** Security test, read-only profile access checks, one-document pilot, then full batch only after explicit production validation.
