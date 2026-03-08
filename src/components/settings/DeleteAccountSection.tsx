import { useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const DeleteAccountSection = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [step, setStep] = useState<"idle" | "ask" | "confirm">("idle");
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (confirmText !== "DELETE") return;
    setDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const res = await supabase.functions.invoke("delete-account", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.error) throw new Error(res.error.message || "Deletion failed");
      toast.success(t("deleteAccount.deleted"));
      await signOut();
      navigate("/auth");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const reset = () => { setStep("idle"); setConfirmText(""); };

  return (
    <section className="rounded-2xl bg-card border border-destructive/20 p-5">
      <h2 className="text-sm font-semibold text-destructive uppercase tracking-wider mb-3 flex items-center gap-2">
        <Trash2 className="w-4 h-4" /> {t("deleteAccount.title")}
      </h2>
      <p className="text-xs text-muted-foreground mb-4 leading-relaxed">{t("deleteAccount.description")}</p>

      {step === "idle" && (
        <button onClick={() => setStep("ask")} className="w-full py-2.5 rounded-xl border border-destructive/30 text-destructive text-sm font-medium hover:bg-destructive/5 transition-colors">
          {t("deleteAccount.deleteBtn")}
        </button>
      )}

      {step === "ask" && (
        <div className="rounded-xl bg-destructive/5 border border-destructive/20 p-4 space-y-3 animate-fade-in">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
            <p className="text-sm font-medium text-foreground">{t("deleteAccount.askTitle")}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={reset} className="flex-1 py-2 rounded-xl bg-secondary text-sm font-medium text-foreground hover:bg-accent transition-colors">
              {t("deleteAccount.keepIt")}
            </button>
            <button onClick={() => setStep("confirm")} className="flex-1 py-2 rounded-xl bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 transition-colors">
              {t("deleteAccount.yesDelete")}
            </button>
          </div>
        </div>
      )}

      {step === "confirm" && (
        <div className="rounded-xl bg-destructive/5 border border-destructive/20 p-4 space-y-3 animate-fade-in">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">{t("deleteAccount.absolutelySure")}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {t("deleteAccount.typeDelete").split("DELETE").map((part, i, arr) => (
                  <span key={i}>
                    {part}
                    {i < arr.length - 1 && <span className="font-mono font-bold text-destructive">DELETE</span>}
                  </span>
                ))}
              </p>
            </div>
          </div>
          <input
            type="text"
            placeholder={t("deleteAccount.placeholder")}
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl bg-card text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-destructive/20 font-mono"
          />
          <div className="flex gap-2">
            <button onClick={reset} className="flex-1 py-2 rounded-xl bg-secondary text-sm font-medium text-foreground hover:bg-accent transition-colors">
              {t("common.cancel")}
            </button>
            <button
              onClick={handleDelete}
              disabled={confirmText !== "DELETE" || deleting}
              className="flex-1 py-2 rounded-xl bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 transition-colors disabled:opacity-50"
            >
              {deleting ? t("deleteAccount.deleting") : t("deleteAccount.deleteForever")}
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export default DeleteAccountSection;
