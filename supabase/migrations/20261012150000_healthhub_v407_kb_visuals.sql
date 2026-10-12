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
-- All derived text and metadata are private and profile-bound.
ALTER TABLE public.hh_kb_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hh_kb_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hh_kb_visuals ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.hh_kb_documents,public.hh_kb_pages,public.hh_kb_visuals TO authenticated;

CREATE POLICY hh_kb_docs_select ON public.hh_kb_documents FOR SELECT TO authenticated
 USING(EXISTS(SELECT 1 FROM public.hh_profile_access a
  WHERE a.profile_key=hh_kb_documents.profile_key AND a.user_id=(SELECT auth.uid())));
CREATE POLICY hh_kb_docs_insert ON public.hh_kb_documents FOR INSERT TO authenticated
 WITH CHECK(EXISTS(SELECT 1 FROM public.hh_profile_access a
  WHERE a.profile_key=hh_kb_documents.profile_key AND a.user_id=(SELECT auth.uid())));
CREATE POLICY hh_kb_docs_update ON public.hh_kb_documents FOR UPDATE TO authenticated
 USING(EXISTS(SELECT 1 FROM public.hh_profile_access a
  WHERE a.profile_key=hh_kb_documents.profile_key AND a.user_id=(SELECT auth.uid())))
 WITH CHECK(EXISTS(SELECT 1 FROM public.hh_profile_access a
  WHERE a.profile_key=hh_kb_documents.profile_key AND a.user_id=(SELECT auth.uid())));

CREATE POLICY hh_kb_pages_select ON public.hh_kb_pages FOR SELECT TO authenticated
 USING(EXISTS(SELECT 1 FROM public.hh_kb_documents d JOIN public.hh_profile_access a
  ON a.profile_key=d.profile_key WHERE d.id=hh_kb_pages.document_id AND a.user_id=(SELECT auth.uid())));
CREATE POLICY hh_kb_pages_insert ON public.hh_kb_pages FOR INSERT TO authenticated
 WITH CHECK(EXISTS(SELECT 1 FROM public.hh_kb_documents d JOIN public.hh_profile_access a
  ON a.profile_key=d.profile_key WHERE d.id=hh_kb_pages.document_id AND a.user_id=(SELECT auth.uid())));
CREATE POLICY hh_kb_pages_update ON public.hh_kb_pages FOR UPDATE TO authenticated
 USING(EXISTS(SELECT 1 FROM public.hh_kb_documents d JOIN public.hh_profile_access a
  ON a.profile_key=d.profile_key WHERE d.id=hh_kb_pages.document_id AND a.user_id=(SELECT auth.uid())))
 WITH CHECK(EXISTS(SELECT 1 FROM public.hh_kb_documents d JOIN public.hh_profile_access a
  ON a.profile_key=d.profile_key WHERE d.id=hh_kb_pages.document_id AND a.user_id=(SELECT auth.uid())));

CREATE POLICY hh_kb_visuals_select ON public.hh_kb_visuals FOR SELECT TO authenticated
 USING(EXISTS(SELECT 1 FROM public.hh_kb_documents d JOIN public.hh_profile_access a
  ON a.profile_key=d.profile_key WHERE d.id=hh_kb_visuals.document_id AND a.user_id=(SELECT auth.uid())));
CREATE POLICY hh_kb_visuals_insert ON public.hh_kb_visuals FOR INSERT TO authenticated
 WITH CHECK(EXISTS(SELECT 1 FROM public.hh_kb_documents d JOIN public.hh_profile_access a
  ON a.profile_key=d.profile_key WHERE d.id=hh_kb_visuals.document_id AND a.user_id=(SELECT auth.uid())));
CREATE POLICY hh_kb_visuals_update ON public.hh_kb_visuals FOR UPDATE TO authenticated
 USING(EXISTS(SELECT 1 FROM public.hh_kb_documents d JOIN public.hh_profile_access a
  ON a.profile_key=d.profile_key WHERE d.id=hh_kb_visuals.document_id AND a.user_id=(SELECT auth.uid())))
 WITH CHECK(EXISTS(SELECT 1 FROM public.hh_kb_documents d JOIN public.hh_profile_access a
  ON a.profile_key=d.profile_key WHERE d.id=hh_kb_visuals.document_id AND a.user_id=(SELECT auth.uid())));
-- Full-page medical image snapshots are private; no public URLs.
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 VALUES('hh-kb-visuals','hh-kb-visuals',false,12000000,ARRAY['image/png','image/webp'])
 ON CONFLICT(id) DO NOTHING;
CREATE POLICY hh_kb_storage_read ON storage.objects FOR SELECT TO authenticated
 USING(bucket_id='hh-kb-visuals' AND EXISTS(
  SELECT 1 FROM public.hh_kb_documents d JOIN public.hh_profile_access a
   ON a.profile_key=d.profile_key
   WHERE d.id::text=split_part(storage.objects.name,'/',2)
    AND d.profile_key=split_part(storage.objects.name,'/',1)
    AND a.user_id=(SELECT auth.uid())));
CREATE POLICY hh_kb_storage_insert ON storage.objects FOR INSERT TO authenticated
 WITH CHECK(bucket_id='hh-kb-visuals'
  AND storage.extension(storage.objects.name) IN('png','webp')
  AND EXISTS(SELECT 1 FROM public.hh_kb_documents d JOIN public.hh_profile_access a
   ON a.profile_key=d.profile_key
   WHERE d.id::text=split_part(storage.objects.name,'/',2)
    AND d.profile_key=split_part(storage.objects.name,'/',1)
    AND a.user_id=(SELECT auth.uid())));
