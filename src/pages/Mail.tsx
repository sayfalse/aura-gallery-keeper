import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Mail, Inbox, Send, Star, Trash2, Plus, ExternalLink, AtSign, Link2 } from "lucide-react";
import { toast } from "sonner";
import ModuleSwitcher from "@/components/ModuleSwitcher";
import QuickNavButton from "@/components/QuickNavButton";

interface MailAccount {
  id: string;
  provider: "gmail" | "outlook" | "other";
  email: string;
}

const providerConfig = {
  gmail: {
    name: "Gmail",
    color: "from-red-500 to-orange-500",
    composeUrl: (to?: string, subject?: string) => {
      const params = new URLSearchParams();
      if (to) params.set("to", to);
      if (subject) params.set("su", subject);
      return `https://mail.google.com/mail/?view=cm&${params.toString()}`;
    },
    inboxUrl: "https://mail.google.com/",
  },
  outlook: {
    name: "Outlook",
    color: "from-blue-500 to-blue-700",
    composeUrl: (to?: string, subject?: string) => {
      const params = new URLSearchParams();
      if (to) params.set("to", to);
      if (subject) params.set("subject", subject);
      return `https://outlook.live.com/mail/0/deeplink/compose?${params.toString()}`;
    },
    inboxUrl: "https://outlook.live.com/mail/",
  },
  other: {
    name: "Other",
    color: "from-gray-500 to-gray-700",
    composeUrl: (to?: string, subject?: string) => `mailto:${to || ""}?subject=${encodeURIComponent(subject || "")}`,
    inboxUrl: "",
  },
};

const MailPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<MailAccount[]>(() => {
    const saved = localStorage.getItem("mail_accounts");
    return saved ? JSON.parse(saved) : [];
  });
  const [showAdd, setShowAdd] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newProvider, setNewProvider] = useState<"gmail" | "outlook" | "other">("gmail");
  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [showCompose, setShowCompose] = useState(false);

  const saveAccounts = (accts: MailAccount[]) => {
    setAccounts(accts);
    localStorage.setItem("mail_accounts", JSON.stringify(accts));
  };

  const handleAddAccount = () => {
    if (!newEmail.trim()) return;
    const account: MailAccount = {
      id: crypto.randomUUID(),
      provider: newProvider,
      email: newEmail.trim(),
    };
    saveAccounts([...accounts, account]);
    setNewEmail("");
    setShowAdd(false);
    toast.success(`${providerConfig[newProvider].name} account added!`);
  };

  const handleRemoveAccount = (id: string) => {
    saveAccounts(accounts.filter((a) => a.id !== id));
    toast.success("Account removed");
  };

  const handleCompose = (account: MailAccount) => {
    const url = providerConfig[account.provider].composeUrl(composeTo, composeSubject);
    window.open(url, "_blank");
    setShowCompose(false);
    setComposeTo("");
    setComposeSubject("");
  };

  const handleOpenInbox = (account: MailAccount) => {
    const url = providerConfig[account.provider].inboxUrl;
    if (url) window.open(url, "_blank");
    else toast.info("Open your email app to check inbox");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col pb-20">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-20">
        <button onClick={() => navigate("/")} className="p-2 rounded-xl hover:bg-accent transition-colors">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex-1 flex items-center gap-2">
          <Mail className="w-5 h-5 text-primary" />
          <h1 className="font-display text-lg font-bold text-foreground">Mail</h1>
        </div>
        <QuickNavButton />
        <button onClick={() => setShowAdd(true)} className="p-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
          <Plus className="w-5 h-5" />
        </button>
      </header>

      <div className="flex-1 p-4 max-w-lg mx-auto w-full space-y-6">
        {/* Add Account Dialog */}
        {showAdd && (
          <div className="rounded-2xl bg-card border border-border p-5 space-y-4 animate-slide-up">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Link2 className="w-4 h-4 text-primary" /> Connect Email Account
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {(["gmail", "outlook", "other"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setNewProvider(p)}
                  className={`p-3 rounded-xl border-2 transition-all text-center ${
                    newProvider === p ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"
                  }`}
                >
                  <div className={`w-8 h-8 mx-auto mb-1.5 rounded-lg bg-gradient-to-br ${providerConfig[p].color} flex items-center justify-center`}>
                    <AtSign className="w-4 h-4 text-white" />
                  </div>
                  <span className={`text-xs font-medium ${newProvider === p ? "text-primary" : "text-muted-foreground"}`}>
                    {providerConfig[p].name}
                  </span>
                </button>
              ))}
            </div>
            <input
              type="email"
              placeholder="your@email.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddAccount()}
              autoFocus
              className="w-full px-3 py-2.5 rounded-xl bg-secondary text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground"
            />
            <div className="flex gap-2">
              <button onClick={() => { setShowAdd(false); setNewEmail(""); }} className="flex-1 py-2 rounded-xl text-sm text-muted-foreground hover:bg-accent transition-colors">
                Cancel
              </button>
              <button onClick={handleAddAccount} className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
                Add Account
              </button>
            </div>
          </div>
        )}

        {/* Accounts List */}
        {accounts.length > 0 ? (
          <div className="space-y-4">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Your Accounts</h2>
            {accounts.map((account) => (
              <div key={account.id} className="rounded-2xl bg-card border border-border p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${providerConfig[account.provider].color} flex items-center justify-center shrink-0`}>
                    <AtSign className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{providerConfig[account.provider].name}</p>
                    <p className="text-xs text-muted-foreground truncate">{account.email}</p>
                  </div>
                  <button onClick={() => handleRemoveAccount(account.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleOpenInbox(account)}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-secondary hover:bg-accent text-sm font-medium text-foreground transition-colors"
                  >
                    <Inbox className="w-4 h-4" />
                    Open Inbox
                    <ExternalLink className="w-3 h-3 text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => {
                      setShowCompose(true);
                      setTimeout(() => {
                        const el = document.getElementById(`compose-${account.id}`);
                        if (el) el.scrollIntoView({ behavior: "smooth" });
                      }, 100);
                    }}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                  >
                    <Send className="w-4 h-4" />
                    Compose
                  </button>
                </div>

                {showCompose && (
                  <div id={`compose-${account.id}`} className="space-y-2 pt-2 border-t border-border">
                    <input
                      type="email"
                      placeholder="To: recipient@email.com"
                      value={composeTo}
                      onChange={(e) => setComposeTo(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-secondary text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground"
                    />
                    <input
                      type="text"
                      placeholder="Subject"
                      value={composeSubject}
                      onChange={(e) => setComposeSubject(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-secondary text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground"
                    />
                    <div className="flex gap-2">
                      <button onClick={() => setShowCompose(false)} className="flex-1 py-2 rounded-xl text-xs text-muted-foreground hover:bg-accent">
                        Cancel
                      </button>
                      <button
                        onClick={() => handleCompose(account)}
                        className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 flex items-center justify-center gap-1"
                      >
                        Open in {providerConfig[account.provider].name}
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : !showAdd ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto mb-6">
              <Mail className="w-10 h-10 text-primary/60" />
            </div>
            <h2 className="font-display text-xl font-bold text-foreground mb-2">Connect Your Email</h2>
            <p className="text-muted-foreground text-sm leading-relaxed mb-6 max-w-xs mx-auto">
              Link your Gmail, Outlook, or other email account to quickly compose and access your inbox.
            </p>
            <button
              onClick={() => setShowAdd(true)}
              className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Email Account
            </button>

            <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto mt-8">
              {[
                { icon: Inbox, label: "Inbox Access" },
                { icon: Send, label: "Quick Compose" },
                { icon: Star, label: "Smart Links" },
                { icon: AtSign, label: "Multi-Account" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2 p-3 rounded-xl bg-muted/50 text-muted-foreground">
                  <item.icon className="w-4 h-4" />
                  <span className="text-xs">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <ModuleSwitcher />
    </div>
  );
};

export default MailPage;
