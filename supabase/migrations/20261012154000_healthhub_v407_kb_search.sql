-- v407.1: profile-secured page search with word and exact punctuation modes.
-- SECURITY INVOKER means the same RLS rules as any direct page query.
CREATE OR REPLACE FUNCTION public.hh_kb_search(
 p_profile_key text, p_query text, p_exact boolean DEFAULT false, p_limit integer DEFAULT 20
)
RETURNS TABLE(document_id uuid,page_no integer,original_name text,
 snippet text,source_class text,status text,relevance real)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public,pg_temp
AS $$
 WITH args AS (
  SELECT left(btrim(p_query),120) AS q,
   websearch_to_tsquery('simple',left(btrim(p_query),120)) AS t
 ), matches AS (
  SELECT p.document_id,p.page_no,d.original_name,d.source_class,d.status,
   p.page_text, a.q,a.t,
   CASE WHEN p_exact THEN 1::real
    ELSE ts_rank(to_tsvector('simple',p.page_text),a.t)::real END AS rank
  FROM public.hh_kb_pages p JOIN public.hh_kb_documents d ON d.id=p.document_id
  CROSS JOIN args a
  WHERE d.profile_key=p_profile_key AND char_length(a.q) BETWEEN 1 AND 120
   AND d.status IN('complete','partial')
   AND (
    (p_exact AND position(lower(a.q) in lower(p.page_text))>0)
    OR (NOT p_exact AND to_tsvector('simple',p.page_text) @@ a.t)
   )
 )
 SELECT m.document_id,m.page_no,m.original_name,
  CASE WHEN p_exact THEN substring(m.page_text from
    greatest(1,position(lower(m.q) in lower(m.page_text))-140) for 750)
   ELSE ts_headline('simple',m.page_text,m.t,
    'MaxFragments=2,MinWords=9,MaxWords=45,FragmentDelimiter= … ')
  END::text AS snippet,
  m.source_class,m.status,m.rank
 FROM matches m
 ORDER BY m.rank DESC,m.original_name,m.page_no
 LIMIT least(greatest(coalesce(p_limit,20),1),40);
$$;
REVOKE ALL ON FUNCTION public.hh_kb_search(text,text,boolean,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.hh_kb_search(text,text,boolean,integer) TO authenticated;
