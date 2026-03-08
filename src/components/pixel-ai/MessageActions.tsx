import { useState, useCallback } from "react";
import { Copy, Check, Volume2, VolumeX, RefreshCw, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";

interface MessageActionsProps {
  content: string;
  role: "user" | "assistant";
  onRegenerate?: () => void;
  isLastAssistant?: boolean;
}

const MessageActions = ({ content, role, onRegenerate, isLastAssistant }: MessageActionsProps) => {
  const [copied, setCopied] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast.success("Copied! 📋");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const ta = document.createElement("textarea");
      ta.value = content;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      toast.success("Copied! 📋");
      setTimeout(() => setCopied(false), 2000);
    }
  }, [content]);

  const handleSpeak = useCallback(() => {
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(content.replace(/[#*`_~\[\]()]/g, ""));
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  }, [content, speaking]);

  return (
    <div className="flex items-center gap-0.5 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
      <button
        onClick={handleCopy}
        className="p-1.5 rounded-lg hover:bg-accent/60 text-muted-foreground hover:text-foreground transition-colors"
        title="Copy"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
      <button
        onClick={handleSpeak}
        className={`p-1.5 rounded-lg hover:bg-accent/60 transition-colors ${speaking ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
        title={speaking ? "Stop" : "Read aloud"}
      >
        {speaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
      </button>
      {role === "assistant" && isLastAssistant && onRegenerate && (
        <button
          onClick={onRegenerate}
          className="p-1.5 rounded-lg hover:bg-accent/60 text-muted-foreground hover:text-foreground transition-colors"
          title="Regenerate"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

export default MessageActions;
