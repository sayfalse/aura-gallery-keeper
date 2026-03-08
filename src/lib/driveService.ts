import { supabase } from "@/integrations/supabase/client";

export interface DriveFile {
  id: string;
  name: string;
  storagePath: string;
  folder: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: Date;
}

export const fetchDriveFiles = async (userId: string, folder: string = "/"): Promise<DriveFile[]> => {
  const { data, error } = await supabase
    .from("drive_files")
    .select("*")
    .eq("user_id", userId)
    .eq("folder", folder)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []).map((r: any) => ({
    id: r.id,
    name: r.name,
    storagePath: r.storage_path,
    folder: r.folder || "/",
    mimeType: r.mime_type || "",
    sizeBytes: r.size_bytes || 0,
    createdAt: new Date(r.created_at),
  }));
};

export const uploadDriveFile = async (userId: string, file: File, folder: string = "/"): Promise<DriveFile> => {
  // Check storage quota before uploading
  const { data: quotaData } = await supabase
    .from("storage_quotas")
    .select("quota_bytes")
    .eq("user_id", userId)
    .maybeSingle();

  const quotaBytes = quotaData?.quota_bytes ?? 1073741824; // default 1GB

  const { data: usageData } = await supabase
    .from("drive_files")
    .select("size_bytes")
    .eq("user_id", userId);

  const currentUsage = (usageData || []).reduce((acc, f: any) => acc + (f.size_bytes || 0), 0);

  if (currentUsage + file.size > quotaBytes) {
    const usedMB = (currentUsage / (1024 * 1024)).toFixed(1);
    const limitMB = (quotaBytes / (1024 * 1024)).toFixed(1);
    throw new Error(`Storage quota exceeded. Used: ${usedMB} MB / ${limitMB} MB. Free up space or contact an admin.`);
  }

  const fileName = `${crypto.randomUUID()}_${file.name}`;
  const storagePath = `${userId}/${fileName}`;

  const { error: uploadError } = await supabase.storage.from("drive").upload(storagePath, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });
  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from("drive_files")
    .insert({
      user_id: userId,
      name: file.name,
      storage_path: storagePath,
      folder,
      mime_type: file.type,
      size_bytes: file.size,
    })
    .select()
    .single();

  if (error) throw error;
  return {
    id: data.id,
    name: data.name,
    storagePath: data.storage_path,
    folder: data.folder || "/",
    mimeType: data.mime_type || "",
    sizeBytes: data.size_bytes || 0,
    createdAt: new Date(data.created_at),
  };
};

export const downloadDriveFile = async (storagePath: string): Promise<Blob> => {
  const { data, error } = await supabase.storage.from("drive").download(storagePath);
  if (error) throw error;
  return data;
};

export const deleteDriveFile = async (id: string, storagePath: string) => {
  await supabase.storage.from("drive").remove([storagePath]);
  const { error } = await supabase.from("drive_files").delete().eq("id", id);
  if (error) throw error;
};

export const moveDriveFile = async (id: string, newFolder: string) => {
  const { error } = await supabase.from("drive_files").update({ folder: newFolder }).eq("id", id);
  if (error) throw error;
};

export const renameDriveFile = async (id: string, newName: string) => {
  const { error } = await supabase.from("drive_files").update({ name: newName }).eq("id", id);
  if (error) throw error;
};

export const getDriveFolders = async (userId: string): Promise<string[]> => {
  const { data, error } = await supabase
    .from("drive_files")
    .select("folder")
    .eq("user_id", userId);

  if (error) throw error;
  const folders = new Set((data || []).map((r: any) => r.folder || "/"));
  folders.add("/");
  return Array.from(folders).sort();
};

export const getStorageAnalytics = async (userId: string) => {
  const { data, error } = await supabase
    .from("drive_files")
    .select("name, mime_type, size_bytes, folder")
    .eq("user_id", userId);

  if (error) throw error;
  const files = data || [];

  const totalSize = files.reduce((acc, f: any) => acc + (f.size_bytes || 0), 0);

  const byType: Record<string, number> = {};
  for (const f of files) {
    const mime = (f as any).mime_type || "";
    let category = "Other";
    if (mime.startsWith("image/")) category = "Images";
    else if (mime.startsWith("video/")) category = "Videos";
    else if (mime.startsWith("audio/")) category = "Audio";
    else if (mime.includes("pdf") || mime.includes("document") || mime.includes("text")) category = "Documents";
    byType[category] = (byType[category] || 0) + ((f as any).size_bytes || 0);
  }

  const byFolder: Record<string, number> = {};
  for (const f of files) {
    const folder = (f as any).folder || "/";
    byFolder[folder] = (byFolder[folder] || 0) + ((f as any).size_bytes || 0);
  }

  const largest = [...files]
    .sort((a: any, b: any) => (b.size_bytes || 0) - (a.size_bytes || 0))
    .slice(0, 5)
    .map((f: any) => ({ name: f.name, size: f.size_bytes || 0 }));

  return { totalSize, byType, byFolder, largest, fileCount: files.length };
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};
