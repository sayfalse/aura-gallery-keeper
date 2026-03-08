import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Mail, Lock, Eye, EyeOff, KeyRound, ShieldCheck, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import type { User as SupaUser } from "@supabase/supabase-js";

interface PersonalInfoSectionProps {
  user: SupaUser;
  displayName: string;
  setDisplayName: (v: string) => void;
  onSaveProfile: () => void;
  saving: boolean;
}

const PersonalInfoSection = ({ user, displayName, setDisplayName, onSaveProfile, saving }: PersonalInfoSectionProps) => {
  const [showChangeEmail, setShowChangeEmail] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);

  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPass, setShowNewPass] = useState(false);
  const [passLoading, setPassLoading] = useState(false);

  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;
  const email = user?.email || "";
  const provider = user?.app_metadata?.provider || "email";

  const handleChangeEmail = async () => {
    if (!newEmail.trim()) return toast.error("Enter a valid email");
    setEmailLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        email: newEmail.trim(),
      });
      if (error) throw error;
      toast.success("Confirmation sent to both old & new email. Check your inbox!");
      setShowChangeEmail(false);
      setNewEmail("");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setEmailLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) return toast.error("Password must be at least 6 characters");
    if (newPassword !== confirmPassword) return toast.error("Passwords don't match");
    setPassLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Password updated successfully!");
      setShowChangePassword(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setPassLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setForgotLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success("Password reset link sent to your email!");
      setShowForgotPassword(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <section className="rounded-2xl bg-card border border-border p-5">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
        <User className="w-4 h-4" /> Personal Info
      </h2>

      {/* Avatar & Basic Info */}
      <div className="flex items-center gap-4 mb-5">
        {avatarUrl ? (
          <img src={avatarUrl} alt="Avatar" className="w-16 h-16 rounded-full object-cover" />
        ) : (
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-8 h-8 text-primary" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
          <p className="text-xs text-muted-foreground truncate">{email}</p>
          <div className="flex items-center gap-1 mt-1">
            <ShieldCheck className="w-3 h-3 text-primary" />
            <span className="text-[10px] text-primary font-medium">Encrypted Account</span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* Display Name */}
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block font-medium">Display Name</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl bg-secondary text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>

        {/* Email (read-only display) */}
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block font-medium">Email Address</label>
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-secondary">
              <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-sm text-foreground truncate">{email}</span>
            </div>
          </div>
        </div>

        {/* Auth provider badge */}
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block font-medium">Sign-in Method</label>
          <div className="px-3 py-2.5 rounded-xl bg-secondary text-sm text-foreground capitalize flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-muted-foreground" />
            {provider === "google" ? "Google Account" : "Email & Password"}
          </div>
        </div>

        <button
          onClick={onSaveProfile}
          disabled={saving}
          className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Profile"}
        </button>

        <div className="pt-2 border-t border-border space-y-2">
          {/* Change Email */}
          <button
            onClick={() => { setShowChangeEmail(!showChangeEmail); setShowChangePassword(false); setShowForgotPassword(false); }}
            className="w-full flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-accent transition-colors text-sm text-foreground"
          >
            <span className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-muted-foreground" />
              Change Email
            </span>
            {showChangeEmail ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>
          {showChangeEmail && (
            <div className="rounded-xl bg-secondary p-4 space-y-3 animate-fade-in">
              <p className="text-xs text-muted-foreground">A confirmation link will be sent to both your current and new email.</p>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  placeholder="New email address"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <button
                onClick={handleChangeEmail}
                disabled={emailLoading}
                className="w-full py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                {emailLoading ? "Sending..." : "Send Confirmation"}
              </button>
            </div>
          )}

          {/* Change Password */}
          <button
            onClick={() => { setShowChangePassword(!showChangePassword); setShowChangeEmail(false); setShowForgotPassword(false); }}
            className="w-full flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-accent transition-colors text-sm text-foreground"
          >
            <span className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-muted-foreground" />
              Change Password
            </span>
            {showChangePassword ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>
          {showChangePassword && (
            <div className="rounded-xl bg-secondary p-4 space-y-3 animate-fade-in">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type={showNewPass ? "text" : "password"}
                  placeholder="New password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={6}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-card text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20"
                />
                <button type="button" onClick={() => setShowNewPass(!showNewPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type={showNewPass ? "text" : "password"}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={6}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              {newPassword.length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-card overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        newPassword.length < 6 ? "w-1/4 bg-destructive" :
                        newPassword.length < 10 ? "w-2/4 bg-yellow-500" :
                        newPassword.length < 14 ? "w-3/4 bg-primary" :
                        "w-full bg-green-500"
                      }`}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {newPassword.length < 6 ? "Too short" : newPassword.length < 10 ? "Fair" : newPassword.length < 14 ? "Good" : "Strong"}
                  </span>
                </div>
              )}
              <button
                onClick={handleChangePassword}
                disabled={passLoading}
                className="w-full py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                {passLoading ? "Updating..." : "Update Password"}
              </button>
            </div>
          )}

          {/* Forgot Password */}
          <button
            onClick={() => { setShowForgotPassword(!showForgotPassword); setShowChangeEmail(false); setShowChangePassword(false); }}
            className="w-full flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-accent transition-colors text-sm text-foreground"
          >
            <span className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-muted-foreground" />
              Forgot Password
            </span>
            {showForgotPassword ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>
          {showForgotPassword && (
            <div className="rounded-xl bg-secondary p-4 space-y-3 animate-fade-in">
              <p className="text-xs text-muted-foreground">
                We'll send a password reset link to <span className="text-foreground font-medium">{email}</span>
              </p>
              <button
                onClick={handleForgotPassword}
                disabled={forgotLoading}
                className="w-full py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                {forgotLoading ? "Sending..." : "Send Reset Link"}
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default PersonalInfoSection;
