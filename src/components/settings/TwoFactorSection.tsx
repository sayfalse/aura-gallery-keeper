import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck, Smartphone, Copy, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

const TwoFactorSection = () => {
  const [enrolling, setEnrolling] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [copied, setCopied] = useState(false);

  // Check current MFA status
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [disabling, setDisabling] = useState(false);
  const [loading, setLoading] = useState(true);

  useState(() => {
    (async () => {
      const { data } = await supabase.auth.mfa.listFactors();
      const totp = data?.totp?.find((f) => f.status === "verified");
      if (totp) {
        setMfaEnabled(true);
        setMfaFactorId(totp.id);
      }
      setLoading(false);
    })();
  });

  const handleEnroll = async () => {
    setEnrolling(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "PixelVault Authenticator",
      });
      if (error) throw error;
      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
      setFactorId(data.id);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setEnrolling(false);
    }
  };

  const handleVerify = async () => {
    if (!factorId || verifyCode.length !== 6) return;
    setVerifying(true);
    try {
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code: verifyCode,
      });
      if (verifyError) throw verifyError;

      setMfaEnabled(true);
      setMfaFactorId(factorId);
      setQrCode(null);
      setSecret(null);
      setFactorId(null);
      setVerifyCode("");
      toast.success("Two-factor authentication enabled!");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setVerifying(false);
    }
  };

  const handleDisable = async () => {
    if (!mfaFactorId) return;
    setDisabling(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: mfaFactorId });
      if (error) throw error;
      setMfaEnabled(false);
      setMfaFactorId(null);
      toast.success("Two-factor authentication disabled");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDisabling(false);
    }
  };

  const copySecret = () => {
    if (!secret) return;
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-3 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Checking 2FA status...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-3 border-t border-border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${mfaEnabled ? "bg-primary/10" : "bg-secondary"}`}>
            <Smartphone className={`w-4.5 h-4.5 ${mfaEnabled ? "text-primary" : "text-muted-foreground"}`} />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Two-Factor Authentication</p>
            <p className="text-xs text-muted-foreground">
              {mfaEnabled ? "Enabled — your account is extra secure" : "Add an extra layer of security"}
            </p>
          </div>
        </div>
        {mfaEnabled ? (
          <button
            onClick={handleDisable}
            disabled={disabling}
            className="text-xs text-destructive font-medium hover:underline disabled:opacity-50"
          >
            {disabling ? "..." : "Disable"}
          </button>
        ) : !qrCode ? (
          <button
            onClick={handleEnroll}
            disabled={enrolling}
            className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {enrolling ? "Setting up..." : "Enable"}
          </button>
        ) : null}
      </div>

      {/* QR Code enrollment */}
      {qrCode && (
        <div className="rounded-xl bg-secondary p-4 space-y-4 animate-fade-in">
          <p className="text-xs text-muted-foreground">
            Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
          </p>
          <div className="flex justify-center">
            <div className="bg-white p-3 rounded-xl">
              <img src={qrCode} alt="2FA QR Code" className="w-48 h-48" />
            </div>
          </div>
          {/* Manual secret */}
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">Or enter this code manually:</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-card px-3 py-2 rounded-lg text-foreground font-mono break-all">
                {secret}
              </code>
              <button onClick={copySecret} className="p-2 rounded-lg hover:bg-accent transition-colors shrink-0">
                {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
              </button>
            </div>
          </div>
          {/* Verification */}
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">Enter the 6-digit code from your app:</p>
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="flex-1 px-3 py-2.5 rounded-xl bg-card text-sm text-foreground text-center font-mono tracking-[0.3em] placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20"
              />
              <button
                onClick={handleVerify}
                disabled={verifying || verifyCode.length !== 6}
                className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                {verifying ? "..." : "Verify"}
              </button>
            </div>
          </div>
          <button
            onClick={() => { setQrCode(null); setSecret(null); setFactorId(null); setVerifyCode(""); }}
            className="text-xs text-muted-foreground hover:text-foreground w-full text-center"
          >
            Cancel
          </button>
        </div>
      )}

      {mfaEnabled && (
        <div className="rounded-xl bg-primary/5 border border-primary/20 p-3 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Your account is protected with two-factor authentication. You'll need your authenticator app when signing in.
          </p>
        </div>
      )}
    </div>
  );
};

export default TwoFactorSection;
