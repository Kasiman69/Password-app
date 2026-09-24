import { supabase } from "./supabase";
import { ITERATIONS, type Sealed } from "./vault-crypto";
export type VaultRow = Sealed & {user_id:string;salt:string;kdf_iterations:number;format_version:number;revision:number;updated_at:string};
function databaseError(code?: string): Error {
  if (code === "PGRST205" || code === "42P01") return new Error("The vault database is not set up yet. Ask the app owner to finish the Supabase setup.");
  return new Error("Your vault could not sync. Check your connection and try again. No changes have been saved.");
}
export async function readVault(userId:string): Promise<VaultRow|null> {
  const {data,error} = await supabase.from("hearth_vaults").select("*").eq("user_id",userId).maybeSingle();
  if(error) throw databaseError(error.code);
  if(data && (data.format_version!==1 || data.kdf_iterations!==ITERATIONS)) throw new Error("This vault uses an unsupported format. Do not overwrite it.");
  return data;
}
export async function createVault(userId:string,salt:string,sealed:Sealed): Promise<VaultRow> {
  const {data,error} = await supabase.from("hearth_vaults").insert({user_id:userId,salt,...sealed,kdf_iterations:ITERATIONS,format_version:1,revision:1}).select().single();
  if(error?.code === "23505") throw new Error("A vault already exists. Sign out and sign back in to unlock it.");
  if(error) throw databaseError(error.code);
  return data;
}
export async function updateVault(row:VaultRow,sealed:Sealed): Promise<VaultRow> {
  const {data,error} = await supabase.from("hearth_vaults").update({...sealed,revision:row.revision+1,updated_at:new Date().toISOString()}).eq("user_id",row.user_id).eq("revision",row.revision).select().maybeSingle();
  if(error) throw databaseError(error.code);
  if(!data) throw new Error("Your vault changed on another device. Lock and unlock it to load the latest version, then try again.");
  return data;
}
