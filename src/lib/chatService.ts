import { supabase } from "@/integrations/supabase/client";

export interface Conversation {
  id: string;
  type: "direct" | "group" | "channel";
  name: string | null;
  description: string | null;
  avatar_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConversationMember {
  id: string;
  conversation_id: string;
  user_id: string;
  role: "admin" | "member";
  joined_at: string;
  last_read_at: string | null;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: "text" | "image" | "file" | "system";
  file_url: string | null;
  file_name: string | null;
  reply_to: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConversationWithDetails extends Conversation {
  lastMessage?: Message | null;
  unreadCount?: number;
  otherUser?: { user_id: string; display_name: string | null; avatar_url: string | null } | null;
  memberCount?: number;
}

export async function getConversations(userId: string): Promise<ConversationWithDetails[]> {
  // Get conversations the user is a member of
  const { data: memberships, error: memErr } = await supabase
    .from("conversation_members")
    .select("conversation_id, last_read_at")
    .eq("user_id", userId);

  if (memErr || !memberships?.length) return [];

  const convIds = memberships.map((m: any) => m.conversation_id);
  const lastReadMap = Object.fromEntries(memberships.map((m: any) => [m.conversation_id, m.last_read_at]));

  const { data: convos, error: convErr } = await supabase
    .from("conversations")
    .select("*")
    .in("id", convIds)
    .order("updated_at", { ascending: false });

  if (convErr || !convos) return [];

  // Get last message for each conversation
  const results: ConversationWithDetails[] = [];

  for (const conv of convos) {
    const { data: msgs } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conv.id)
      .order("created_at", { ascending: false })
      .limit(1);

    const lastMessage = msgs?.[0] || null;

    // Count unread
    let unreadCount = 0;
    const lastRead = lastReadMap[conv.id];
    if (lastRead && lastMessage) {
      const { count } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", conv.id)
        .gt("created_at", lastRead)
        .neq("sender_id", userId);
      unreadCount = count || 0;
    }

    // For direct chats, get the other user's profile
    let otherUser = null;
    if (conv.type === "direct") {
      const { data: members } = await supabase
        .from("conversation_members")
        .select("user_id")
        .eq("conversation_id", conv.id)
        .neq("user_id", userId)
        .limit(1);

      if (members?.[0]) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url")
          .eq("user_id", members[0].user_id)
          .single();
        otherUser = profile;
      }
    }

    // Get member count for groups
    const { count: memberCount } = await supabase
      .from("conversation_members")
      .select("id", { count: "exact", head: true })
      .eq("conversation_id", conv.id);

    results.push({
      ...conv,
      type: conv.type as "direct" | "group" | "channel",
      lastMessage: lastMessage as Message | null,
      unreadCount,
      otherUser,
      memberCount: memberCount || 0,
    });
  }

  return results;
}

export async function getMessages(conversationId: string, limit = 50): Promise<Message[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) throw error;
  return (data || []) as Message[];
}

export async function sendMessage(conversationId: string, senderId: string, content: string, type: "text" | "image" | "file" = "text", fileUrl?: string, fileName?: string, replyTo?: string) {
  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      content,
      message_type: type,
      file_url: fileUrl || null,
      file_name: fileName || null,
      reply_to: replyTo || null,
    })
    .select()
    .single();

  if (error) throw error;

  // Update conversation's updated_at
  await supabase
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);

  return data as Message;
}

export async function createDirectConversation(userId: string, otherUserId: string): Promise<string> {
  // Check if a direct conversation already exists
  const { data: myMemberships } = await supabase
    .from("conversation_members")
    .select("conversation_id")
    .eq("user_id", userId);

  if (myMemberships?.length) {
    for (const m of myMemberships) {
      const { data: conv } = await supabase
        .from("conversations")
        .select("id, type")
        .eq("id", m.conversation_id)
        .eq("type", "direct")
        .single();

      if (conv) {
        const { data: otherMember } = await supabase
          .from("conversation_members")
          .select("user_id")
          .eq("conversation_id", conv.id)
          .eq("user_id", otherUserId)
          .single();

        if (otherMember) return conv.id;
      }
    }
  }

  // Create new conversation
  const { data: newConv, error: convErr } = await supabase
    .from("conversations")
    .insert({ type: "direct", created_by: userId })
    .select()
    .single();

  if (convErr) throw convErr;

  // Add both members
  const { error: memErr } = await supabase
    .from("conversation_members")
    .insert([
      { conversation_id: newConv.id, user_id: userId, role: "admin" },
      { conversation_id: newConv.id, user_id: otherUserId, role: "member" },
    ]);

  if (memErr) throw memErr;

  return newConv.id;
}

export async function createGroupConversation(userId: string, name: string, memberIds: string[]): Promise<string> {
  const { data: newConv, error: convErr } = await supabase
    .from("conversations")
    .insert({ type: "group", name, created_by: userId })
    .select()
    .single();

  if (convErr) throw convErr;

  const members = [userId, ...memberIds].map((uid) => ({
    conversation_id: newConv.id,
    user_id: uid,
    role: uid === userId ? "admin" as const : "member" as const,
  }));

  const { error: memErr } = await supabase
    .from("conversation_members")
    .insert(members);

  if (memErr) throw memErr;

  return newConv.id;
}

export async function markAsRead(conversationId: string, userId: string) {
  await supabase
    .from("conversation_members")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("user_id", userId);
}

export async function searchUsers(query: string, currentUserId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, display_name, avatar_url, username")
    .neq("user_id", currentUserId)
    .or(`display_name.ilike.%${query}%,username.ilike.%${query}%`)
    .limit(20);

  if (error) throw error;
  return data || [];
}
