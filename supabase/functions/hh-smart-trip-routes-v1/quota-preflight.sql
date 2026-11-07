-- Smart Trip V5 quota deployment read-only inspection.
-- This is NOT a backup and makes NO changes.
select current_database() as database_name,
       current_setting('server_version') as postgres_version,
       to_regclass('public.hh_smart_trip_google_quota') as quota_table,
       to_regprocedure('public.hh_smart_trip_google_reserve()') as reserve_rpc;
select count(*) as storage_bucket_count from storage.buckets;
select count(*) as storage_object_count from storage.objects;
-- After migration, verify privileges with:
-- select has_function_privilege('anon','public.hh_smart_trip_google_reserve()','EXECUTE') as anon_exec,
--        has_function_privilege('authenticated','public.hh_smart_trip_google_reserve()','EXECUTE') as user_exec,
--        has_function_privilege('service_role','public.hh_smart_trip_google_reserve()','EXECUTE') as service_exec;
-- select period_kind,period_start,used from public.hh_smart_trip_google_quota;
