import { useState, useEffect, useCallback } from "react";
import { UserPlus, Search, Check, X, Users, Loader2, AtSign, Bell } from "lucide-react";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";
import {
  getUsername,
  updateUsername,
  searchUsersByUsername,
  sendSharingInvite,
  acceptSharingInvite,
  removeSharingConnection,
  updateConnectionSettings,
  fetchConnections,
  type SharingConnection,
} from "@/lib/sharingService";

interface SharingSectionProps {
  user: User;
}

const SharingSection = ({ user }: SharingSectionProps) => {
  const [username, setUsername] = useState("");
  const [savedUsername, setSavedUsername] = useState<string | null>(null);
  const [usernameLoading, setUsernameLoading] = useState(false);
  const [connections, setConnections] = useState<SharingConnection[]>([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [inviting, setInviting] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const [un, conns] = await Promise.all([
      getUsername(user.id),
      fetchConnections(user.id),
    ]);
    setSavedUsername(un);
    if (un) setUsername(un);
    setConnections(conns);
  }, [user.id]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSaveUsername = async () => {
    setUsernameLoading(true);
    try {
      const saved = await updateUsername(user.id, username);
      setSavedUsername(saved);
      setUsername(saved);
      toast.success("Username saved!");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUsernameLoading(false);
    }
  };

  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (q.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const results = await searchUsersByUsername(q, user.id);
      setSearchResults(results);
    } catch { setSearchResults([]); }
    finally { setSearching(false); }
  };

  const handleInvite = async (targetUserId: string) => {
    setInviting(targetUserId);
    try {
      await sendSharingInvite(user.id, targetUserId);
      toast.success("Sharing invite sent!");
      setShowAddUser(false);
      setSearchQuery("");
      setSearchResults([]);
      await loadData();
    } catch (err: any) {
      toast.error(err.message?.includes("duplicate") ? "Already connected" : err.message);
    } finally { setInviting(null); }
  };

  const handleAccept = async (id: string) => {
    try {
      await acceptSharingInvite(id);
      toast.success("Invite accepted!");
      await loadData();
    } catch { toast.error("Failed to accept"); }
  };

  const handleRemove = async (id: string) => {
    try {
      await removeSharingConnection(id);
      toast.success("Connection removed");
      await loadData();
    } catch { toast.error("Failed to remove"); }
  };

  const handleToggle = async (id: string, field: "auto_share" | "auto_save", value: boolean) => {
    try {
      await updateConnectionSettings(id, { [field]: value });
      setConnections((prev) =>
        prev.map((c) =>
          c.id === id
            ? { ...c, [field === "auto_share" ? "autoShare" : "autoSave"]: value }
            : c
        )
      );
    } catch { toast.error("Failed to update"); }
  };

  const pendingInvites = connections.filter(
    (c) => c.status === "pending" && c.connectedUserId === user.id
  );
  const activeConnections = connections.filter((c) => c.status === "accepted");
  const sentPending = connections.filter(
    (c) => c.status === "pending" && c.ownerId === user.id
  );

  return (
    <>
      {/* Username Section */}
      <section className="rounded-2xl bg-card border border-border p-5">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
          <AtSign className="w-4 h-4" /> Username
        </h2>
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block font-medium">Your Username</label>
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
              <input
                type="text"
                placeholder="Set a unique username"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ""))}
                maxLength={30}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-primary/10 border border-primary/20 text-sm font-medium text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
            <button
              onClick={handleSaveUsername}
              disabled={usernameLoading || username === savedUsername || username.length < 3}
              className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {usernameLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
            </button>
          </div>
          {savedUsername && (
            <p className="text-xs text-muted-foreground mt-1.5">
              Your username: <span className="text-foreground font-medium">@{savedUsername}</span>
            </p>
          )}
        </div>
      </section>

      {/* Add Friend Section */}
      <section className="rounded-2xl bg-card border border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <UserPlus className="w-4 h-4" /> Add Friend
          </h2>
          <button
            onClick={() => setShowAddUser(!showAddUser)}
            className="flex items-center gap-1 text-xs text-primary font-medium hover:underline"
          >
            {showAddUser ? "Close" : "Search"}
          </button>
        </div>

        {showAddUser ? (
          <div className="rounded-xl bg-secondary p-3 space-y-2 animate-fade-in">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by username..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-card text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            {searching && (
              <div className="flex justify-center py-2">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            )}
            {searchResults.map((r) => (
              <div key={r.userId} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-card transition-colors">
                <div>
                  <p className="text-sm font-medium text-foreground">{r.displayName || r.username}</p>
                  {r.username && <p className="text-xs text-muted-foreground">@{r.username}</p>}
                </div>
                <button
                  onClick={() => handleInvite(r.userId)}
                  disabled={inviting === r.userId}
                  className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50"
                >
                  {inviting === r.userId ? <Loader2 className="w-3 h-3 animate-spin" /> : "Invite"}
                </button>
              </div>
            ))}
            {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-2">No users found</p>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-3">
            Search for users by username to add friends
          </p>
        )}
      </section>

      {/* Pending Invites Section */}
      {(pendingInvites.length > 0 || sentPending.length > 0) && (
        <section className="rounded-2xl bg-card border border-border p-5">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
            <Bell className="w-4 h-4" /> Pending Invites ({pendingInvites.length + sentPending.length})
          </h2>

          {pendingInvites.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-muted-foreground font-medium mb-2">Received</p>
              <div className="space-y-2">
                {pendingInvites.map((c) => (
                  <div key={c.id} className="flex items-center justify-between p-3 rounded-xl bg-primary/5 border border-primary/20">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {c.connectedDisplayName || "Unknown User"}
                      </p>
                      {c.connectedUsername && (
                        <p className="text-xs text-muted-foreground">@{c.connectedUsername}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAccept(c.id)}
                        className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleRemove(c.id)}
                        className="p-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {sentPending.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-2">Sent</p>
              <div className="space-y-2">
                {sentPending.map((c) => (
                  <div key={c.id} className="flex items-center justify-between p-2.5 rounded-xl bg-secondary">
                    <div>
                      <p className="text-sm text-foreground">{c.connectedDisplayName || "User"}</p>
                      <p className="text-xs text-muted-foreground">Pending...</p>
                    </div>
                    <button
                      onClick={() => handleRemove(c.id)}
                      className="text-xs text-destructive hover:underline"
                    >
                      Cancel
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Shared With Me Section */}
      <section className="rounded-2xl bg-card border border-border p-5">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
          <Users className="w-4 h-4" /> Shared With ({activeConnections.length})
        </h2>

        {activeConnections.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">
            No sharing connections yet. Add a friend to start sharing!
          </p>
        )}

        <div className="space-y-2">
          {activeConnections.map((c) => {
            const isOwner = c.ownerId === user.id;
            const otherName = c.connectedDisplayName || "User";
            const otherUsername = c.connectedUsername;
            return (
              <div key={c.id} className="rounded-xl bg-primary/10 border border-primary/20 p-3">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">{otherName}</p>
                    {otherUsername && <p className="text-xs text-muted-foreground">@{otherUsername}</p>}
                  </div>
                  <button
                    onClick={() => handleRemove(c.id)}
                    className="text-xs text-destructive hover:underline"
                  >
                    Remove
                  </button>
                </div>
                {isOwner && (
                  <div className="space-y-2 pt-2 border-t border-border">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Auto-share uploads</span>
                      <button
                        onClick={() => handleToggle(c.id, "auto_share", !c.autoShare)}
                        className={`w-10 h-6 rounded-full transition-colors relative ${c.autoShare ? "bg-primary" : "bg-border"}`}
                      >
                        <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${c.autoShare ? "translate-x-4" : "translate-x-0.5"}`} />
                      </button>
                    </div>
                  </div>
                )}
                {!isOwner && (
                  <div className="space-y-2 pt-2 border-t border-border">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Auto-save received items</span>
                      <button
                        onClick={() => handleToggle(c.id, "auto_save", !c.autoSave)}
                        className={`w-10 h-6 rounded-full transition-colors relative ${c.autoSave ? "bg-primary" : "bg-border"}`}
                      >
                        <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${c.autoSave ? "translate-x-4" : "translate-x-0.5"}`} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
};

export default SharingSection;