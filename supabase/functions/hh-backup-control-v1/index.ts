/* SHO · Backup Control Edge Function, staging code only.
 * Deployed server-side after explicit main/release approval.
 * Supabase gateway verify_jwt should remain true.  Owner check is independent.
 */
import { handleBackupControl } from "../_shared/backup-control-v1.mjs";
Deno.serve((request)=>handleBackupControl(request,{env:(k)=>Deno.env.get(k),fetchImpl:fetch}));
