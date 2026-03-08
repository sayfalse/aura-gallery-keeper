import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import {
  getConversations, getMessages, sendMessage, createDirectConversation,
  createGroupConversation, markAsRead, searchUsers,
  type ConversationWithDetails, type Message
} from "@/lib/chatService";
import {
  ArrowLeft, MessageCircle, Search, Send, Plus, Users, User, Check, CheckCheck,
  Image as ImageIcon, Paperclip, Smile, MoreVertical, Phone, Video, Hash
} from "lucide-react";
import { toast } from "sonner";
import { format, isToday, isYesterday } from "date-fns";
import ModuleSwitcher from "@/components/ModuleSwitcher";
import QuickNavButton from "@/components/QuickNavButton";

const ChatPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
  const [activeConv, setActiveConv] = useState<ConversationWithDetails | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [profiles, setProfiles] = useState<Record<string, { display_name: string | null; avatar_url: string | null }>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadConversations = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getConversations(user.id);
      setConversations(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // Load messages when conversation is selected
  useEffect(() => {
    if (!activeConv || !user) return;
    let cancelled = false;

    const load = async () => {
      try {
        const msgs = await getMessages(activeConv.id);
        if (!cancelled) {
          setMessages(msgs);
          markAsRead(activeConv.id, user.id);

          // Load profiles for message senders
          const senderIds = [...new Set(msgs.map(m => m.sender_id))];
          const missing = senderIds.filter(id => !profiles[id]);
          if (missing.length) {
            const { data } = await supabase
              .from("profiles")
              .select("user_id, display_name, avatar_url")
              .in("user_id", missing);
            if (data) {
              setProfiles(prev => {
                const next = { ...prev };
                data.forEach((p: any) => { next[p.user_id] = p; });
                return next;
              });
            }
          }
        }
      } catch {
        toast.error(t("chat.failedLoad"));
      }
    };
    load();

    // Subscribe to new messages
    const channel = supabase
      .channel(`messages:${activeConv.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${activeConv.id}`,
      }, (payload) => {
        const newMessage = payload.new as Message;
        setMessages(prev => [...prev, newMessage]);
        if (user) markAsRead(activeConv.id, user.id);

        // Load profile if needed
        if (!profiles[newMessage.sender_id]) {
          supabase
            .from("profiles")
            .select("user_id, display_name, avatar_url")
            .eq("user_id", newMessage.sender_id)
            .single()
            .then(({ data }) => {
              if (data) {
                setProfiles(prev => ({ ...prev, [data.user_id]: data }));
              }
            });
        }
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [activeConv?.id, user]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!newMsg.trim() || !activeConv || !user || sending) return;
    const content = newMsg.trim();
    setNewMsg("");
    setSending(true);
    try {
      await sendMessage(activeConv.id, user.id, content);
      loadConversations();
    } catch {
      toast.error(t("chat.failedSend"));
      setNewMsg(content);
    } finally {
      setSending(false);
    }
  };

  const handleSearch = useCallback(async (q: string) => {
    if (!user || q.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const results = await searchUsers(q, user.id);
      setSearchResults(results);
    } catch {
      // silent
    } finally {
      setSearching(false);
    }
  }, [user]);

  useEffect(() => {
    const timer = setTimeout(() => handleSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery, handleSearch]);

  const startDirectChat = async (otherUserId: string) => {
    if (!user) return;
    try {
      const convId = await createDirectConversation(user.id, otherUserId);
      setShowNewChat(false);
      setSearchQuery("");
      setSearchResults([]);
      // Reload conversations and find the new one
      const updated = await getConversations(user.id);
      setConversations(updated);
      const found = updated.find(c => c.id === convId);
      if (found) {
        setActiveConv(found);
      } else {
        // Fallback: create a minimal conversation object to open
        setActiveConv({
          id: convId,
          type: "direct",
          name: null,
          description: null,
          avatar_url: null,
          created_by: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          lastMessage: null,
          unreadCount: 0,
          otherUser: searchResults.find(u => u.user_id === otherUserId) || null,
          memberCount: 2,
        });
      }
    } catch (err: any) {
      console.error("Failed to start conversation:", err);
      toast.error(err?.message || t("chat.failedStart"));
    }
  };

  const handleCreateGroup = async () => {
    if (!user || !groupName.trim() || selectedMembers.length === 0) return;
    try {
      const convId = await createGroupConversation(user.id, groupName.trim(), selectedMembers);
      setShowNewGroup(false);
      setGroupName("");
      setSelectedMembers([]);
      setSearchQuery("");
      await loadConversations();
      const updated = await getConversations(user.id);
      setConversations(updated);
      const found = updated.find(c => c.id === convId);
      if (found) setActiveConv(found);
    } catch {
      toast.error(t("chat.failedCreateGroup"));
    }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isToday(d)) return format(d, "h:mm a");
    if (isYesterday(d)) return "Yesterday";
    return format(d, "MMM d");
  };

  const getConvName = (conv: ConversationWithDetails) => {
    if (conv.type === "direct" && conv.otherUser) return conv.otherUser.display_name || "User";
    return conv.name || "Group";
  };

  const getConvAvatar = (conv: ConversationWithDetails) => {
    if (conv.type === "direct" && conv.otherUser?.avatar_url) return conv.otherUser.avatar_url;
    return conv.avatar_url;
  };

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  // Conversation list view
  if (!activeConv) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="flex items-center gap-3 px-4 py-3 border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-20">
          <button onClick={() => navigate("/")} className="p-2 rounded-xl hover:bg-accent transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex-1 flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            <h1 className="font-display text-lg font-bold text-foreground">Messages</h1>
          </div>
          <QuickNavButton />
          <button
            onClick={() => setShowNewGroup(true)}
            className="p-2 rounded-xl hover:bg-accent transition-colors text-muted-foreground"
            title="New group"
          >
            <Users className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowNewChat(true)}
            className="p-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            title="New chat"
          >
            <Plus className="w-5 h-5" />
          </button>
        </header>

        {/* New chat / group modal */}
        {(showNewChat || showNewGroup) && (
          <div className="fixed inset-0 z-50 bg-background flex flex-col">
            <header className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
              <button onClick={() => { setShowNewChat(false); setShowNewGroup(false); setSearchQuery(""); setSearchResults([]); setSelectedMembers([]); setGroupName(""); }} className="p-2 rounded-xl hover:bg-accent">
                <ArrowLeft className="w-5 h-5 text-foreground" />
              </button>
              <h2 className="font-display text-lg font-bold text-foreground">
                {showNewGroup ? "New Group" : "New Chat"}
              </h2>
            </header>

            {showNewGroup && (
              <div className="px-4 py-3 border-b border-border">
                <input
                  type="text"
                  placeholder="Group name..."
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-secondary text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20"
                />
                {selectedMembers.length > 0 && (
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="text-xs text-muted-foreground">{selectedMembers.length} selected</span>
                    <button
                      onClick={handleCreateGroup}
                      disabled={!groupName.trim()}
                      className="ml-auto px-3 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-medium disabled:opacity-50"
                    >
                      Create
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="px-4 py-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-secondary text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4">
              {searching && (
                <div className="flex justify-center py-8">
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {searchResults.map((u) => (
                <button
                  key={u.user_id}
                  onClick={() => {
                    if (showNewGroup) {
                      setSelectedMembers(prev =>
                        prev.includes(u.user_id) ? prev.filter(id => id !== u.user_id) : [...prev, u.user_id]
                      );
                    } else {
                      startDirectChat(u.user_id);
                    }
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-accent/50 transition-colors"
                >
                  {u.avatar_url ? (
                    <img src={u.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                  )}
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{u.display_name || u.username || "User"}</p>
                    {u.username && <p className="text-xs text-muted-foreground">@{u.username}</p>}
                  </div>
                  {showNewGroup && selectedMembers.includes(u.user_id) && (
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-4 h-4 text-primary-foreground" />
                    </div>
                  )}
                </button>
              ))}
              {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-8">No users found</p>
              )}
              {searchQuery.length < 2 && (
                <p className="text-center text-sm text-muted-foreground py-8">Type at least 2 characters to search</p>
              )}
            </div>
          </div>
        )}

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto pb-24">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-20 px-6">
              <MessageCircle className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No conversations yet</p>
              <p className="text-xs text-muted-foreground mt-1">Tap + to start a new chat</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {conversations.map((conv) => {
                const name = getConvName(conv);
                const avatar = getConvAvatar(conv);
                return (
                  <button
                    key={conv.id}
                    onClick={() => setActiveConv(conv)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent/30 transition-colors text-left"
                  >
                    {avatar ? (
                      <img src={avatar} alt="" className="w-12 h-12 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                        conv.type === "group" ? "bg-emerald-500/10" : conv.type === "channel" ? "bg-blue-500/10" : "bg-primary/10"
                      }`}>
                        {conv.type === "group" ? (
                          <Users className="w-5 h-5 text-emerald-500" />
                        ) : conv.type === "channel" ? (
                          <Hash className="w-5 h-5 text-blue-500" />
                        ) : (
                          <span className="text-sm font-bold text-primary">{getInitials(name)}</span>
                        )}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-foreground truncate">{name}</p>
                        {conv.lastMessage && (
                          <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                            {formatTime(conv.lastMessage.created_at)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-xs text-muted-foreground truncate">
                          {conv.lastMessage?.content || "No messages yet"}
                        </p>
                        {(conv.unreadCount || 0) > 0 && (
                          <span className="ml-2 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shrink-0">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <ModuleSwitcher />
      </div>
    );
  }

  // Message thread view
  const convName = getConvName(activeConv);
  const convAvatar = getConvAvatar(activeConv);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Chat header */}
      <header className="flex items-center gap-3 px-3 py-2.5 border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-20 shrink-0">
        <button onClick={() => { setActiveConv(null); loadConversations(); }} className="p-2 rounded-xl hover:bg-accent transition-colors">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        {convAvatar ? (
          <img src={convAvatar} alt="" className="w-9 h-9 rounded-full object-cover" />
        ) : (
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
            {activeConv.type === "group" ? (
              <Users className="w-4 h-4 text-emerald-500" />
            ) : (
              <span className="text-xs font-bold text-primary">{getInitials(convName)}</span>
            )}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{convName}</p>
          <p className="text-[10px] text-muted-foreground">
            {activeConv.type === "group" ? `${activeConv.memberCount} members` : "Online"}
          </p>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
        {messages.map((msg, i) => {
          const isMe = msg.sender_id === user?.id;
          const showAvatar = !isMe && (i === 0 || messages[i - 1]?.sender_id !== msg.sender_id);
          const senderProfile = profiles[msg.sender_id];
          const senderName = senderProfile?.display_name || "User";

          return (
            <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"} ${showAvatar ? "mt-3" : "mt-0.5"}`}>
              {!isMe && showAvatar && activeConv.type !== "direct" && (
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center mr-2 mt-auto shrink-0">
                  {senderProfile?.avatar_url ? (
                    <img src={senderProfile.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                  ) : (
                    <span className="text-[10px] font-bold text-primary">{getInitials(senderName)}</span>
                  )}
                </div>
              )}
              {!isMe && !showAvatar && activeConv.type !== "direct" && <div className="w-7 mr-2 shrink-0" />}
              <div className={`max-w-[75%] ${isMe ? "items-end" : "items-start"}`}>
                {showAvatar && !isMe && activeConv.type !== "direct" && (
                  <p className="text-[10px] text-muted-foreground ml-1 mb-0.5">{senderName}</p>
                )}
                <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                  isMe
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-secondary text-foreground rounded-bl-md"
                }`}>
                  {msg.content}
                </div>
                <p className={`text-[9px] text-muted-foreground mt-0.5 ${isMe ? "text-right mr-1" : "ml-1"}`}>
                  {format(new Date(msg.created_at), "h:mm a")}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Message input */}
      <div className="shrink-0 border-t border-border bg-background px-3 py-2 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 bg-secondary rounded-2xl px-3 py-2">
            <input
              ref={inputRef}
              type="text"
              placeholder="Message..."
              value={newMsg}
              onChange={(e) => setNewMsg(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!newMsg.trim() || sending}
            className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-50 shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
