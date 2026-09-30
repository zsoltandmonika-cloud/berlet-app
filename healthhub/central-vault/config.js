/* HealthHub Central Health Vault configuration.
   The Supabase publishable key is intended for browser use.
   Never place service_role or database passwords in this file. */
window.HH_CENTRAL_VAULT = Object.freeze({
  enabled: false,
  supabaseUrl: "",
  publishableKey: "",
  householdSlug: "zsolt-monika",
  sourceOfTruth: "central",
  cacheKey: "hh-health-vault-v1"
});
