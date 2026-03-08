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

  // Batch: get all members for all conversations at once
  const { data: allMembers } = await supabase
    .from("conversation_members")
    .select("conversation_id, user_id")
    .in("conversation_id", convIds);

  // Batch: get last message per conversation (fetch recent messages in batch)
  const { data: allMessages } = await supabase
    .from("messages")
    .select("*")
    .in("conversation_id", convIds)
    .order("created_at", { ascending: false })
    .limit(convIds.length * 2);

  // Group last messages by conversation
  const lastMessageMap: Record<string, any> = {};
  (allMessages || []).forEach((msg: any) => {
    if (!lastMessageMap[msg.conversation_id]) {
      lastMessageMap[msg.conversation_id] = msg;
    }
  });

  // Find other users for direct chats
  const otherUserIds = new Set<string>();
  const membersByConv: Record<string, any[]> = {};
  (allMembers || []).forEach((m: any) => {
    if (!membersByConv[m.conversation_id]) membersByConv[m.conversation_id] = [];
    membersByConv[m.conversation_id].push(m);
    if (m.user_id !== userId) otherUserIds.add(m.user_id);
  });

  // Batch load profiles
  const profileMap: Record<string, any> = {};
  if (otherUserIds.size > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url")
      .in("user_id", Array.from(otherUserIds));
    (profiles || []).forEach((p: any) => { profileMap[p.user_id] = p; });
  }

  const results: ConversationWithDetails[] = convos.map((conv: any) => {
    const lastMessage = lastMessageMap[conv.id] || null;
    const members = membersByConv[conv.id] || [];

    // Count unread
    let unreadCount = 0;
    const lastRead = lastReadMap[conv.id];
    if (lastRead && lastMessage && new Date(lastMessage.created_at) > new Date(lastRead) && lastMessage.sender_id !== userId) {
      unreadCount = 1; // Simplified - mark as having unread
    }

    // Other user for direct chats
    let otherUser = null;
    if (conv.type === "direct") {
      const otherMember = members.find((m: any) => m.user_id !== userId);
      if (otherMember) otherUser = profileMap[otherMember.user_id] || null;
    }

    return {
      ...conv,
      type: conv.type as "direct" | "group" | "channel",
      lastMessage: lastMessage as Message | null,
      unreadCount,
      otherUser,
      memberCount: members.length,
    };
  });

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
  // Check if a direct conversation already exists between these two users
  const { data: myMemberships } = await supabase
    .from("conversation_members")
    .select("conversation_id")
    .eq("user_id", userId);

  if (myMemberships?.length) {
    const { data: otherMemberships } = await supabase
      .from("conversation_members")
      .select("conversation_id")
      .eq("user_id", otherUserId)
      .in("conversation_id", myMemberships.map((m: any) => m.conversation_id));

    if (otherMemberships?.length) {
      // Check which ones are direct conversations
      for (const om of otherMemberships) {
        const { data: conv } = await supabase
          .from("conversations")
          .select("id, type")
          .eq("id", om.conversation_id)
          .eq("type", "direct")
          .single();

        if (conv) return conv.id;
      }
    }
  }

  // Create new conversation
  const { data: newConv, error: convErr } = await supabase
    .from("conversations")
    .insert({ type: "direct", created_by: userId })
    .select()
    .single();

  if (convErr) {
    console.error("Failed to create conversation:", convErr);
    throw new Error("Failed to create conversation. Please try again.");
  }

  // Add both members - insert one at a time to handle RLS
  const { error: memErr1 } = await supabase
    .from("conversation_members")
    .insert({ conversation_id: newConv.id, user_id: userId, role: "admin" });

  if (memErr1) {
    console.error("Failed to add creator as member:", memErr1);
    throw new Error("Failed to set up conversation. Please try again.");
  }

  const { error: memErr2 } = await supabase
    .from("conversation_members")
    .insert({ conversation_id: newConv.id, user_id: otherUserId, role: "member" });

  if (memErr2) {
    console.error("Failed to add other user as member:", memErr2);
    // Clean up: remove the conversation we just created
    await supabase.from("conversation_members").delete().eq("conversation_id", newConv.id);
    await supabase.from("conversations").delete().eq("id", newConv.id);
    throw new Error("Failed to add user to conversation. Please try again.");
  }

  return newConv.id;
}

export async function createGroupConversation(userId: string, name: string, memberIds: string[]): Promise<string> {
  const { data: newConv, error: convErr } = await supabase
    .from("conversations")
    .insert({ type: "group", name, created_by: userId })
    .select()
    .single();

  if (convErr) throw new Error("Failed to create group. Please try again.");

  // Add creator first
  await supabase
    .from("conversation_members")
    .insert({ conversation_id: newConv.id, user_id: userId, role: "admin" });

  // Add other members one by one
  for (const uid of memberIds) {
    await supabase
      .from("conversation_members")
      .insert({ conversation_id: newConv.id, user_id: uid, role: "member" });
  }

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
