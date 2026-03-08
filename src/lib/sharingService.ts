import { supabase } from "@/integrations/supabase/client";

export interface SharingConnection {
  id: string;
  ownerId: string;
  connectedUserId: string;
  connectedUsername?: string;
  connectedDisplayName?: string;
  autoShare: boolean;
  autoSave: boolean;
  status: string;
  createdAt: Date;
}

export const updateUsername = async (userId: string, username: string) => {
  const cleaned = username.trim().toLowerCase().replace(/[^a-z0-9._]/g, "");
  if (cleaned.length < 3) throw new Error("Username must be at least 3 characters");
  if (cleaned.length > 30) throw new Error("Username must be 30 characters or less");

  const { error } = await supabase
    .from("profiles")
    .update({ username: cleaned } as any)
    .eq("user_id", userId);

  if (error) {
    if (error.message.includes("duplicate") || error.message.includes("unique")) {
      throw new Error("Username already taken");
    }
    throw error;
  }
  return cleaned;
};

export const getUsername = async (userId: string): Promise<string | null> => {
  const { data, error } = await supabase
    .from("profiles")
    .select("username" as any)
    .eq("user_id", userId)
    .single();

  if (error) return null;
  return (data as any)?.username || null;
};

export const searchUsersByUsername = async (query: string, currentUserId: string) => {
  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, display_name, username, avatar_url" as any)
    .neq("user_id", currentUserId)
    .ilike("username" as any, `%${query}%`)
    .limit(10);

  if (error) throw error;
  return (data || []).map((r: any) => ({
    userId: r.user_id,
    displayName: r.display_name,
    username: r.username,
    avatarUrl: r.avatar_url,
  }));
};

export const sendSharingInvite = async (ownerId: string, connectedUserId: string) => {
  const { data, error } = await supabase
    .from("sharing_connections" as any)
    .insert({
      owner_id: ownerId,
      connected_user_id: connectedUserId,
      status: "pending",
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const acceptSharingInvite = async (connectionId: string) => {
  const { error } = await supabase
    .from("sharing_connections" as any)
    .update({ status: "accepted" })
    .eq("id", connectionId);

  if (error) throw error;
};

export const removeSharingConnection = async (connectionId: string) => {
  const { error } = await supabase
    .from("sharing_connections" as any)
    .delete()
    .eq("id", connectionId);

  if (error) throw error;
};

export const updateConnectionSettings = async (
  connectionId: string,
  settings: { auto_share?: boolean; auto_save?: boolean }
) => {
  const { error } = await supabase
    .from("sharing_connections" as any)
    .update(settings)
    .eq("id", connectionId);

  if (error) throw error;
};

export const fetchConnections = async (userId: string): Promise<SharingConnection[]> => {
  const { data, error } = await supabase
    .from("sharing_connections" as any)
    .select("*")
    .or(`owner_id.eq.${userId},connected_user_id.eq.${userId}`)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const connections = data || [];
  
  // Fetch profile info for connected users
  const otherUserIds = connections.map((c: any) =>
    c.owner_id === userId ? c.connected_user_id : c.owner_id
  );

  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, display_name, username, avatar_url" as any)
    .in("user_id", otherUserIds);

  const profileMap = new Map(
    (profiles || []).map((p: any) => [p.user_id, p])
  );

  return connections.map((c: any) => {
    const otherUserId = c.owner_id === userId ? c.connected_user_id : c.owner_id;
    const profile = profileMap.get(otherUserId) as any;
    return {
      id: c.id,
      ownerId: c.owner_id,
      connectedUserId: c.connected_user_id,
      connectedUsername: profile?.username || undefined,
      connectedDisplayName: profile?.display_name || undefined,
      autoShare: c.auto_share,
      autoSave: c.auto_save,
      status: c.status,
      createdAt: new Date(c.created_at),
    };
  });
};
