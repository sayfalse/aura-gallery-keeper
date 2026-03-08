import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { exchangeGmailCode } from "@/lib/gmailService";
import { toast } from "sonner";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

const GmailCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
      setStatus("error");
      toast.error("Gmail authorization was cancelled");
      setTimeout(() => navigate("/mail"), 2000);
      return;
    }

    if (!code) {
      setStatus("error");
      toast.error("No authorization code received");
      setTimeout(() => navigate("/mail"), 2000);
      return;
    }

    const redirectUri = `${window.location.origin}/gmail-callback`;
    exchangeGmailCode(code, redirectUri)
      .then((result) => {
        setStatus("success");
        toast.success(`Gmail account ${result.email} connected!`);
        setTimeout(() => navigate("/mail"), 1500);
      })
      .catch((err) => {
        console.error("Gmail callback error:", err);
        setStatus("error");
        toast.error("Failed to connect Gmail account");
        setTimeout(() => navigate("/mail"), 2000);
      });
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        {status === "loading" && (
          <>
            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
            <p className="text-foreground font-medium">Connecting Gmail account...</p>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
            <p className="text-foreground font-medium">Gmail connected! Redirecting...</p>
          </>
        )}
        {status === "error" && (
          <>
            <XCircle className="w-12 h-12 text-destructive mx-auto" />
            <p className="text-foreground font-medium">Connection failed. Redirecting...</p>
          </>
        )}
      </div>
    </div>
  );
};

export default GmailCallback;
