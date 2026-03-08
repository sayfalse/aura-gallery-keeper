/**
 * File Vault Service
 * Client-side encryption + Supabase storage for PIN-protected file vault.
 */
import { supabase } from "@/integrations/supabase/client";

const VAULT_PIN_HASH_KEY = "vault_pin_hash";

// --- PIN management ---

async function hashPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode(pin);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export const hasVaultPin = () => !!localStorage.getItem(VAULT_PIN_HASH_KEY);

export const setVaultPin = async (pin: string) => {
  localStorage.setItem(VAULT_PIN_HASH_KEY, await hashPin(pin));
};

export const verifyVaultPin = async (pin: string): Promise<boolean> => {
  const stored = localStorage.getItem(VAULT_PIN_HASH_KEY);
  if (!stored) return false;
  return (await hashPin(pin)) === stored;
};

export const removeVaultPin = () => localStorage.removeItem(VAULT_PIN_HASH_KEY);

// --- Encryption helpers (AES-GCM with PIN-derived key) ---

async function deriveKey(pin: string, salt: Uint8Array): Promise<CryptoKey> {
  const raw = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 100_000, hash: "SHA-256" },
    raw,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptFile(file: File, pin: string): Promise<Blob> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(pin, salt);
  const plaintext = await file.arrayBuffer();
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);

  // Format: [salt(16)] [iv(12)] [ciphertext]
  const combined = new Uint8Array(16 + 12 + ciphertext.byteLength);
  combined.set(salt, 0);
  combined.set(iv, 16);
  combined.set(new Uint8Array(ciphertext), 28);
  return new Blob([combined], { type: "application/octet-stream" });
}

export async function decryptFile(blob: Blob, pin: string, mimeType?: string): Promise<Blob> {
  const buf = await blob.arrayBuffer();
  const arr = new Uint8Array(buf);
  const salt = arr.slice(0, 16);
  const iv = arr.slice(16, 28);
  const ciphertext = arr.slice(28);
  const key = await deriveKey(pin, salt);
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return new Blob([plaintext], { type: mimeType || "application/octet-stream" });
}

// --- CRUD ---

export interface VaultFile {
  id: string;
  name: string;
  mime_type: string | null;
  size_bytes: number | null;
  storage_path: string;
  created_at: string;
}

export async function listVaultFiles(userId: string): Promise<VaultFile[]> {
  const { data, error } = await supabase
    .from("vault_files" as any)
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as VaultFile[];
}

export async function uploadVaultFile(userId: string, file: File, pin: string): Promise<VaultFile> {
  const encrypted = await encryptFile(file, pin);
  const path = `${userId}/${Date.now()}_${file.name}.enc`;

  const { error: uploadErr } = await supabase.storage.from("vault").upload(path, encrypted);
  if (uploadErr) throw uploadErr;

  const { data, error } = await supabase
    .from("vault_files" as any)
    .insert({ user_id: userId, name: file.name, mime_type: file.type, size_bytes: file.size, storage_path: path })
    .select()
    .single();
  if (error) throw error;
  return data as unknown as VaultFile;
}

export async function downloadVaultFile(file: VaultFile, pin: string): Promise<Blob> {
  const { data, error } = await supabase.storage.from("vault").download(file.storage_path);
  if (error || !data) throw error || new Error("Download failed");
  return decryptFile(data, pin, file.mime_type || undefined);
}

export async function deleteVaultFile(file: VaultFile): Promise<void> {
  await supabase.storage.from("vault").remove([file.storage_path]);
  const { error } = await supabase.from("vault_files" as any).delete().eq("id", file.id);
  if (error) throw error;
}
