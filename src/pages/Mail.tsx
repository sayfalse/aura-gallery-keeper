import { useState, useEffect, useCallback } from "react";
import DOMPurify from "dompurify";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  ArrowLeft, Mail, Inbox, Send, Star, Trash2, Plus, Search, RefreshCw,
  ChevronLeft, Archive, MailOpen, Reply, Loader2, LogOut, AlertCircle,
  FileText, Tag, Clock, Paperclip, X, Download
} from "lucide-react";
import { toast } from "sonner";
import ModuleSwitcher from "@/components/ModuleSwitcher";
import QuickNavButton from "@/components/QuickNavButton";
import {
  getGmailAuthUrl, getGmailAccounts, removeGmailAccount,
  listMessages, getMessage, sendMessage, modifyMessage, trashMessage,
  getHeader, getMessageBody, getAttachments, getAttachment, base64UrlToBlob,
  type GmailMessage, type AttachmentInfo,
} from "@/lib/gmailService";

type View = "accounts" | "inbox" | "message" | "compose";

interface GmailAccount {
  email: string;
  created_at: string;
}

const LABELS: { id: string; label: string; icon: typeof Inbox }[] = [
  { id: "INBOX", label: "Inbox", icon: Inbox },
  { id: "STARRED", label: "Starred", icon: Star },
  { id: "SENT", label: "Sent", icon: Send },
  { id: "DRAFT", label: "Drafts", icon: FileText },
  { id: "TRASH", label: "Trash", icon: Trash2 },
];

const MailPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [view, setView] = useState<View>("accounts");
  const [accounts, setAccounts] = useState<GmailAccount[]>([]);
  const [activeEmail, setActiveEmail] = useState<string>("");
  const [activeLabel, setActiveLabel] = useState("INBOX");
  const [messages, setMessages] = useState<GmailMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<GmailMessage | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  // Compose state
  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<{ messageId: string; threadId: string; subject: string; from: string } | null>(null);
  const [attachments, setAttachments] = useState<{ filename: string; mimeType: string; data: string; size: number }[]>([]);

  // Load accounts on mount
  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const data = await getGmailAccounts();
      setAccounts(data.accounts || []);
      if (data.accounts?.length > 0 && !activeEmail) {
        setActiveEmail(data.accounts[0].email);
      }
    } catch {
      // No accounts yet
    }
  };

  const handleConnectGmail = async () => {
    try {
      setLoading(true);
      const redirectUri = `${window.location.origin}/gmail-callback`;
      const { url } = await getGmailAuthUrl(redirectUri);
      window.location.href = url;
    } catch (err) {
      console.error(err);
      toast.error("Failed to start Gmail authorization");
      setLoading(false);
    }
  };

  const handleRemoveAccount = async (email: string) => {
    try {
      await removeGmailAccount(email);
      setAccounts((prev) => prev.filter((a) => a.email !== email));
      if (activeEmail === email) {
        setActiveEmail(accounts.find((a) => a.email !== email)?.email || "");
        setView("accounts");
      }
      toast.success("Account disconnected");
    } catch {
      toast.error("Failed to remove account");
    }
  };

  const loadMessages = useCallback(async (label?: string) => {
    if (!activeEmail) return;
    setLoading(true);
    try {
      const data = await listMessages(activeEmail, {
        labelIds: label || activeLabel,
        q: searchQuery || undefined,
        maxResults: "20",
      });
      setMessages(data.messages || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load messages");
    } finally {
      setLoading(false);
    }
  }, [activeEmail, activeLabel, searchQuery]);

  const openInbox = (email: string) => {
    setActiveEmail(email);
    setActiveLabel("INBOX");
    setView("inbox");
  };

  useEffect(() => {
    if (view === "inbox" && activeEmail) {
      loadMessages();
    }
  }, [view, activeEmail, activeLabel, loadMessages]);

  const openMessage = async (msgId: string) => {
    setLoading(true);
    try {
      const data = await getMessage(activeEmail, msgId);
      setSelectedMessage(data);
      setView("message");
      // Mark as read
      if (data.labelIds?.includes("UNREAD")) {
        modifyMessage(activeEmail, msgId, undefined, ["UNREAD"]).catch(() => {});
      }
    } catch {
      toast.error("Failed to load message");
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!composeTo.trim() || !composeSubject.trim()) {
      toast.error("Please fill in To and Subject fields");
      return;
    }
    setSending(true);
    try {
      await sendMessage(activeEmail, composeTo, composeSubject, composeBody || "<p></p>", {
        ...(replyTo ? { inReplyTo: replyTo.messageId, threadId: replyTo.threadId } : {}),
        ...(attachments.length > 0 ? { attachments: attachments.map(a => ({ filename: a.filename, mimeType: a.mimeType, data: a.data })) } : {}),
      });
      toast.success("Email sent!");
      setComposeTo("");
      setComposeSubject("");
      setComposeBody("");
      setReplyTo(null);
      setAttachments([]);
      setView("inbox");
      loadMessages();
    } catch (err) {
      console.error(err);
      toast.error("Failed to send email");
    } finally {
      setSending(false);
    }
  };

  const handleStar = async (msgId: string, isStarred: boolean) => {
    try {
      if (isStarred) {
        await modifyMessage(activeEmail, msgId, undefined, ["STARRED"]);
      } else {
        await modifyMessage(activeEmail, msgId, ["STARRED"]);
      }
      loadMessages();
    } catch {
      toast.error("Failed to update message");
    }
  };

  const handleTrash = async (msgId: string) => {
    try {
      await trashMessage(activeEmail, msgId);
      toast.success("Moved to trash");
      if (view === "message") {
        setView("inbox");
      }
      loadMessages();
    } catch {
      toast.error("Failed to trash message");
    }
  };

  const handleArchive = async (msgId: string) => {
    try {
      await modifyMessage(activeEmail, msgId, undefined, ["INBOX"]);
      toast.success("Archived");
      if (view === "message") setView("inbox");
      loadMessages();
    } catch {
      toast.error("Failed to archive");
    }
  };

  const startReply = (msg: GmailMessage) => {
    const from = getHeader(msg, "From");
    const subject = getHeader(msg, "Subject");
    setComposeTo(from.match(/<(.+?)>/)?.[1] || from);
    setComposeSubject(subject.startsWith("Re:") ? subject : `Re: ${subject}`);
    setComposeBody("");
    setReplyTo({ messageId: msg.id, threadId: msg.threadId, subject, from });
    setAttachments([]);
    setView("compose");
  };

  const startCompose = () => {
    setComposeTo("");
    setComposeSubject("");
    setComposeBody("");
    setReplyTo(null);
    setAttachments([]);
    setView("compose");
  };

  const handleAttachFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB per file

    Array.from(files).forEach((file) => {
      if (file.size > MAX_SIZE) {
        toast.error(`${file.name} is too large (max 10MB)`);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(",")[1];
        setAttachments((prev) => [...prev, {
          filename: file.name,
          mimeType: file.type || "application/octet-stream",
          data: base64,
          size: file.size,
        }]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (internalDate: string) => {
    const date = new Date(parseInt(internalDate));
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 86400000) return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (diff < 604800000) return date.toLocaleDateString([], { weekday: "short" });
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const extractName = (from: string) => {
    const match = from.match(/^"?([^"<]+)"?\s*</);
    return match ? match[1].trim() : from.split("@")[0];
  };

  // ─── RENDER ────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background flex flex-col pb-20">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-20">
        <button
          onClick={() => {
            if (view === "message" || view === "compose") setView("inbox");
            else if (view === "inbox") setView("accounts");
            else navigate("/");
          }}
          className="p-2 rounded-xl hover:bg-accent transition-colors"
        >
          {view === "accounts" ? <ArrowLeft className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <Mail className="w-5 h-5 text-primary shrink-0" />
          <h1 className="font-display text-lg font-bold text-foreground truncate">
            {view === "accounts" && "Mail"}
            {view === "inbox" && activeEmail}
            {view === "message" && (selectedMessage ? getHeader(selectedMessage, "Subject") || "Message" : "Message")}
            {view === "compose" && (replyTo ? "Reply" : "Compose")}
          </h1>
        </div>
        <QuickNavButton />
        {view === "inbox" && (
          <>
            <button onClick={() => setShowSearch(!showSearch)} className="p-2 rounded-xl hover:bg-accent transition-colors text-muted-foreground">
              <Search className="w-5 h-5" />
            </button>
            <button onClick={() => loadMessages()} className="p-2 rounded-xl hover:bg-accent transition-colors text-muted-foreground">
              <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button onClick={startCompose} className="p-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
              <Plus className="w-5 h-5" />
            </button>
          </>
        )}
        {view === "accounts" && (
          <button onClick={handleConnectGmail} disabled={loading} className="p-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
          </button>
        )}
      </header>

      {/* Search bar */}
      {view === "inbox" && showSearch && (
        <div className="px-4 py-2 border-b border-border bg-card">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary shrink-0" />
            <input
              type="text"
              placeholder="Search emails..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadMessages()}
              autoFocus
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-primary/10 border border-primary/20 text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground transition-all"
            />
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {/* ─── ACCOUNTS VIEW ─── */}
        {view === "accounts" && (
          <div className="p-4 max-w-lg mx-auto w-full space-y-6">
            {accounts.length > 0 ? (
              <div className="space-y-3">
                <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Connected Accounts</h2>
                {accounts.map((acct) => (
                  <div key={acct.email} className="rounded-2xl bg-card border border-border p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shrink-0">
                      <Mail className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">Gmail</p>
                      <p className="text-xs text-muted-foreground truncate">{acct.email}</p>
                    </div>
                    <button onClick={() => openInbox(acct.email)} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors">
                      Open
                    </button>
                    <button onClick={() => handleRemoveAccount(acct.email)} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto mb-6">
                  <Mail className="w-10 h-10 text-primary/60" />
                </div>
                <h2 className="font-display text-xl font-bold text-foreground mb-2">Connect Gmail</h2>
                <p className="text-muted-foreground text-sm leading-relaxed mb-6 max-w-xs mx-auto">
                  Sign in with your Google account to read, compose, and manage emails right here.
                </p>
                <button
                  onClick={handleConnectGmail}
                  disabled={loading}
                  className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors inline-flex items-center gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Connect Gmail Account
                </button>

                <div className="mt-8 p-4 rounded-xl bg-muted/50 text-left max-w-sm mx-auto">
                  <h3 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-primary" /> Setup Required
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    You need Google OAuth credentials configured. Make sure you've set up a Google Cloud project with Gmail API enabled and added the OAuth Client ID & Secret.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── INBOX VIEW ─── */}
        {view === "inbox" && (
          <div className="max-w-lg mx-auto w-full">
            {/* Label tabs */}
            <div className="flex gap-1 px-4 py-2 overflow-x-auto border-b border-border bg-card/50">
              {LABELS.map((l) => (
                <button
                  key={l.id}
                  onClick={() => setActiveLabel(l.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    activeLabel === l.id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent"
                  }`}
                >
                  <l.icon className="w-3.5 h-3.5" />
                  {l.label}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-16">
                <MailOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No messages</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {messages.map((msg) => {
                  const from = getHeader(msg, "From");
                  const subject = getHeader(msg, "Subject");
                  const isUnread = msg.labelIds?.includes("UNREAD");
                  const isStarred = msg.labelIds?.includes("STARRED");

                  return (
                    <button
                      key={msg.id}
                      onClick={() => openMessage(msg.id)}
                      className="w-full text-left px-4 py-3 hover:bg-accent/30 transition-colors flex items-start gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`text-sm truncate ${isUnread ? "font-bold text-foreground" : "font-medium text-foreground/80"}`}>
                            {extractName(from)}
                          </span>
                          <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                            {formatDate(msg.internalDate)}
                          </span>
                        </div>
                        <p className={`text-sm truncate ${isUnread ? "font-semibold text-foreground" : "text-foreground/70"}`}>
                          {subject || "(no subject)"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {msg.snippet}
                        </p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleStar(msg.id, isStarred); }}
                        className="p-1 shrink-0 mt-1"
                      >
                        <Star className={`w-4 h-4 ${isStarred ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`} />
                      </button>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── MESSAGE VIEW ─── */}
        {view === "message" && selectedMessage && (
          <div className="max-w-lg mx-auto w-full p-4 space-y-4">
            <h2 className="font-display text-lg font-bold text-foreground">
              {getHeader(selectedMessage, "Subject") || "(no subject)"}
            </h2>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                {extractName(getHeader(selectedMessage, "From")).charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {extractName(getHeader(selectedMessage, "From"))}
                </p>
                <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(parseInt(selectedMessage.internalDate)).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <button onClick={() => startReply(selectedMessage)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors">
                <Reply className="w-3.5 h-3.5" /> Reply
              </button>
              <button onClick={() => handleArchive(selectedMessage.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground text-xs font-medium hover:bg-accent transition-colors">
                <Archive className="w-3.5 h-3.5" /> Archive
              </button>
              <button onClick={() => handleTrash(selectedMessage.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground text-xs font-medium hover:bg-destructive/10 hover:text-destructive transition-colors">
                <Trash2 className="w-3.5 h-3.5" /> Trash
              </button>
            </div>

            {/* Attachments */}
            {(() => {
              const msgAttachments = getAttachments(selectedMessage);
              if (msgAttachments.length === 0) return null;
              return (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5" />
                    {msgAttachments.length} Attachment{msgAttachments.length > 1 ? "s" : ""}
                  </p>
                  <div className="grid gap-2">
                    {msgAttachments.map((att, i) => (
                      <button
                        key={i}
                        onClick={async () => {
                          try {
                            toast.info(`Downloading ${att.filename}...`);
                            const data = await getAttachment(activeEmail, selectedMessage.id, att.attachmentId);
                            const blob = base64UrlToBlob(data.data, att.mimeType);
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = att.filename;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            URL.revokeObjectURL(url);
                          } catch {
                            toast.error(`Failed to download ${att.filename}`);
                          }
                        }}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-accent/50 hover:bg-accent transition-colors text-left"
                      >
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{att.filename}</p>
                          <p className="text-xs text-muted-foreground">
                            {att.size < 1024 ? `${att.size} B` : att.size < 1024 * 1024 ? `${(att.size / 1024).toFixed(1)} KB` : `${(att.size / (1024 * 1024)).toFixed(1)} MB`}
                          </p>
                        </div>
                        <Download className="w-4 h-4 text-muted-foreground shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Message body */}
            <div className="rounded-xl border border-border bg-card p-4 overflow-x-auto">
              <div
                className="prose prose-sm max-w-none text-foreground [&_a]:text-primary [&_img]:max-w-full [&_img]:h-auto"
                dangerouslySetInnerHTML={{ __html: getMessageBody(selectedMessage) }}
              />
            </div>
          </div>
        )}

        {/* ─── COMPOSE VIEW ─── */}
        {view === "compose" && (
          <div className="max-w-lg mx-auto w-full p-4 space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Tag className="w-3.5 h-3.5" /> From: {activeEmail}
              </div>

              <input
                type="email"
                placeholder="To"
                value={composeTo}
                onChange={(e) => setComposeTo(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-primary/10 border border-primary/20 text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground transition-all"
              />

              <input
                type="text"
                placeholder="Subject"
                value={composeSubject}
                onChange={(e) => setComposeSubject(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-primary/10 border border-primary/20 text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground transition-all"
              />

              <textarea
                placeholder="Write your message..."
                value={composeBody}
                onChange={(e) => setComposeBody(e.target.value)}
                rows={12}
                className="w-full px-3 py-2.5 rounded-xl bg-primary/10 border border-primary/20 text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground resize-none transition-all"
              />

              {/* Attachments */}
              {attachments.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Attachments ({attachments.length})</p>
                  {attachments.map((att, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent/50 text-sm">
                      <Paperclip className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate flex-1 text-foreground">{att.filename}</span>
                      <span className="text-xs text-muted-foreground shrink-0">{formatFileSize(att.size)}</span>
                      <button onClick={() => removeAttachment(i)} className="p-0.5 rounded hover:bg-destructive/10 hover:text-destructive transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <label className="py-2.5 px-3 rounded-xl text-sm text-muted-foreground hover:bg-accent transition-colors cursor-pointer flex items-center gap-1.5">
                  <Paperclip className="w-4 h-4" />
                  Attach
                  <input type="file" multiple onChange={handleAttachFiles} className="hidden" />
                </label>
                <button
                  onClick={() => { setView("inbox"); setReplyTo(null); setAttachments([]); }}
                  className="flex-1 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-accent transition-colors"
                >
                  Discard
                </button>
                <button
                  onClick={handleSend}
                  disabled={sending}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {sending ? "Sending..." : "Send"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <ModuleSwitcher />
    </div>
  );
};

export default MailPage;
