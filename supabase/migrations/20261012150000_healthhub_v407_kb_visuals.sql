-- HealthHub v407: private document knowledge base.
-- Original PDFs remain in Google Drive. Derived pages live under RLS.
CREATE TABLE IF NOT EXISTS public.hh_kb_documents(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 profile_key text NOT NULL REFERENCES public.hh_profiles(profile_key),
 source_file_id text NOT NULL CHECK(length(source_file_id) BETWEEN 8 AND 160),
 source_document_id text,
 original_name text NOT NULL CHECK(length(original_name) BETWEEN 1 AND 350),
 source_modified_at timestamptz,
 size_bytes bigint,
 sha256 text CHECK(sha256 IS NULL OR sha256 ~ '^[a-f0-9]{64}$'),
 source_class text NOT NULL DEFAULT 'unverified'
  CHECK(source_class IN('unverified','clinical_original','device','secondary_summary','other')),
 classification_status text NOT NULL DEFAULT 'pending'
  CHECK(classification_status IN('pending','reviewed')),
 status text NOT NULL DEFAULT 'discovered'
  CHECK(status IN('discovered','processing','partial','complete','failed','changed_needs_review')),
 total_pages integer NOT NULL DEFAULT 0 CHECK(total_pages BETWEEN 0 AND 3000),
 pages_indexed integer NOT NULL DEFAULT 0 CHECK(pages_indexed BETWEEN 0 AND 3000),
 pages_needing_ocr integer NOT NULL DEFAULT 0 CHECK(pages_needing_ocr BETWEEN 0 AND 3000),
 visual_pages integer NOT NULL DEFAULT 0 CHECK(visual_pages BETWEEN 0 AND 3000),
 duplicate_of uuid,
 notes text NOT NULL DEFAULT '' CHECK(length(notes)<=1200),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(profile_key,source_file_id), UNIQUE(id,profile_key),
 FOREIGN KEY(duplicate_of,profile_key) REFERENCES public.hh_kb_documents(id,profile_key),
 CHECK(duplicate_of IS NULL OR duplicate_of<>id)
);
CREATE INDEX IF NOT EXISTS hh_kb_docs_profile_status ON public.hh_kb_documents(profile_key,status);
CREATE INDEX IF NOT EXISTS hh_kb_docs_hash ON public.hh_kb_documents(profile_key,sha256);

CREATE TABLE IF NOT EXISTS public.hh_kb_pages(
 document_id uuid NOT NULL REFERENCES public.hh_kb_documents(id) ON DELETE CASCADE,
 page_no integer NOT NULL CHECK(page_no BETWEEN 1 AND 3000),
 page_text text NOT NULL DEFAULT '' CHECK(octet_length(page_text)<=125000),
 extraction_method text NOT NULL DEFAULT 'none'
  CHECK(extraction_method IN('embedded','ocr','none')),
 visual_candidate boolean NOT NULL DEFAULT false,
 visual_hint text NOT NULL DEFAULT 'none'
  CHECK(visual_hint IN('none','ekg_candidate','image_or_chart','scanned_page')),
 needs_review boolean NOT NULL DEFAULT false,
 text_sha256 text CHECK(text_sha256 IS NULL OR text_sha256 ~ '^[a-f0-9]{64}$'),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(document_id,page_no)
);
CREATE INDEX IF NOT EXISTS hh_kb_pages_fts ON public.hh_kb_pages
 USING gin(to_tsvector('simple',page_text));

CREATE TABLE IF NOT EXISTS public.hh_kb_visuals(
 document_id uuid NOT NULL, page_no integer NOT NULL,
 storage_path text NOT NULL CHECK(length(storage_path)<=500),
 kind text NOT NULL DEFAULT 'visual_candidate'
  CHECK(kind IN('visual_candidate','ekg_reviewed','medical_image_reviewed','other_reviewed')),
 mime_type text NOT NULL DEFAULT 'image/png'
  CHECK(mime_type IN('image/png','image/webp')),
 bytes integer NOT NULL CHECK(bytes BETWEEN 1 AND 12000000),
 pixel_width integer NOT NULL CHECK(pixel_width BETWEEN 1 AND 10000),
 pixel_height integer NOT NULL CHECK(pixel_height BETWEEN 1 AND 10000),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(document_id,page_no),
 FOREIGN KEY(document_id,page_no) REFERENCES public.hh_kb_pages(document_id,page_no) ON DELETE CASCADE
);
