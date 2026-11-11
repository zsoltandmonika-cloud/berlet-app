-- v1179: random cron token is generated INSIDE Postgres; never returned to
-- ChatGPT, GitHub, public clients, API responses or application logs.
do $setup$
declare
  generated_secret text;
begin
  if not exists (select 1 from public.hh_interfood_bridge_config_v1 where name='cron_v1') then
    generated_secret := encode(gen_random_bytes(32),'hex');
    perform vault.create_secret(generated_secret,'hh_interfood_bridge_cron_v1179',
      'Dedicated HealthHub Interfood Outlook Edge poller token');
    insert into public.hh_interfood_bridge_config_v1(name,secret_sha256)
    values ('cron_v1',encode(sha256(convert_to(generated_secret,'UTF8')),'hex'));
  end if;
end
$setup$;
select cron.schedule('hh-interfood-outlook-bridge-v1179','47 */2 * * *',
$job$
select net.http_post(
 url:='https://vhsrupphzcjkdrusonzh.supabase.co/functions/v1/hh-interfood-outlook-bridge-v1179',
 headers:=jsonb_build_object(
  'Content-Type','application/json',
  'x-hh-cron-key',(select decrypted_secret from vault.decrypted_secrets where name='hh_interfood_bridge_cron_v1179')
 ),
 body:='{"action":"cron"}'::jsonb,
 timeout_milliseconds:=20000
);
$job$);
