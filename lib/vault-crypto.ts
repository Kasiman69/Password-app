export type Entry = { id: string; title: string; username: string; password: string; website: string; notes: string; favorite: boolean; updatedAt: string };
export type Vault = { version: 1; entries: Entry[] };
export type Sealed = { ciphertext: string; iv: string };
export const ITERATIONS = 600_000;
const encoder = new TextEncoder();
export function encode(bytes: Uint8Array): string {
  let value = "";
  for (const byte of bytes) value += String.fromCharCode(byte);
  return btoa(value);
}
export function decode(value: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(value), c => c.charCodeAt(0));
}
export function newSalt(): string { return encode(crypto.getRandomValues(new Uint8Array(16))); }
export async function deriveKey(passphrase: string, salt: string): Promise<CryptoKey> {
  if (decode(salt).length !== 16) throw new Error("Invalid vault salt.");
  const material = await crypto.subtle.importKey("raw", encoder.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({name:"PBKDF2",salt:decode(salt),iterations:ITERATIONS,hash:"SHA-256"},material,{name:"AES-GCM",length:256},false,["encrypt","decrypt"]);
}
export async function seal(vault: Vault, key: CryptoKey, owner: string): Promise<Sealed> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({name:"AES-GCM",iv,additionalData:encoder.encode(`hearth:v1:${owner}`)},key,encoder.encode(JSON.stringify(vault)));
  return {ciphertext:encode(new Uint8Array(ciphertext)),iv:encode(iv)};
}
export function validateVault(value: unknown): Vault {
  const v = value as Vault;
  if (!v || v.version !== 1 || !Array.isArray(v.entries) || v.entries.length > 1000) throw new Error("Invalid vault data.");
  const ids = new Set<string>();
  for (const e of v.entries) {
    if (!e || typeof e.favorite !== "boolean" || [e.id,e.title,e.username,e.password,e.website,e.notes,e.updatedAt].some(x => typeof x !== "string") || ids.has(e.id)) throw new Error("Invalid vault entry.");
    ids.add(e.id);
  }
  return v;
}
export async function unseal(data: Sealed, key: CryptoKey, owner: string): Promise<Vault> {
  if (decode(data.iv).length !== 12 || data.ciphertext.length > 1_400_000) throw new Error("Invalid encrypted vault.");
  const clear = await crypto.subtle.decrypt({name:"AES-GCM",iv:decode(data.iv),additionalData:encoder.encode(`hearth:v1:${owner}`)},key,decode(data.ciphertext));
  return validateVault(JSON.parse(new TextDecoder().decode(clear)));
}
function randomIndex(size: number): number {
  const limit = 256 - (256 % size);
  const byte = new Uint8Array(1);
  do { crypto.getRandomValues(byte); } while (byte[0] >= limit);
  return byte[0] % size;
}
export function generatePassword(length = 20, symbols = true): string {
  if (!Number.isInteger(length) || length < 12 || length > 64) throw new Error("Choose a length from 12 to 64.");
  const groups = ["abcdefghijkmnpqrstuvwxyz","ABCDEFGHJKLMNPQRSTUVWXYZ","23456789",...(symbols?["!@#$%&*+-=?"]:[])];
  const alphabet = groups.join("");
  const chars = groups.map(group=>group[randomIndex(group.length)]);
  while (chars.length < length) chars.push(alphabet[randomIndex(alphabet.length)]);
  for (let i=chars.length-1;i>0;i--) { const j=randomIndex(i+1); [chars[i],chars[j]]=[chars[j],chars[i]]; }
  return chars.join("");
}
