import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Send, Sparkles, ImageIcon, Loader2, Trash2, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import ModuleSwitcher from "@/components/ModuleSwitcher";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  images?: string[];
  isLoading?: boolean;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/pixel-chat`;

const PixelAI = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [imageMode, setImageMode] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, 50);
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  const sendTextMessage = async (userContent: string, allMessages: Message[]) => {
    let assistantSoFar = "";
    const assistantId = crypto.randomUUID();

    setMessages(prev => [...prev, { id: assistantId, role: "assistant", content: "", isLoading: true }]);

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: allMessages.filter(m => !m.images).map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || `Error ${resp.status}`);
      }

      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, idx);
          buf = buf.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try {
            const parsed = JSON.parse(json);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              assistantSoFar += delta;
              setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: assistantSoFar, isLoading: false } : m));
            }
          } catch { /* partial */ }
        }
      }

      if (!assistantSoFar) {
        setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: "I couldn't generate a response. Please try again.", isLoading: false } : m));
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to get response");
      setMessages(prev => prev.filter(m => m.id !== assistantId));
    }
  };

  const sendImageMessage = async (prompt: string) => {
    const assistantId = crypto.randomUUID();
    setMessages(prev => [...prev, { id: assistantId, role: "assistant", content: "🎨 Generating image...", isLoading: true }]);

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: [{ role: "user", content: prompt }], generateImage: true }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || `Error ${resp.status}`);
      }

      const data = await resp.json();
      const images = data.choices?.[0]?.message?.images?.map((img: any) => img.image_url?.url) || [];
      const text = data.choices?.[0]?.message?.content || "Here's your generated image:";

      setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: text, images, isLoading: false } : m));
    } catch (e: any) {
      toast.error(e.message || "Image generation failed");
      setMessages(prev => prev.filter(m => m.id !== assistantId));
    }
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: trimmed };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);

    if (imageMode) {
      await sendImageMessage(trimmed);
    } else {
      await sendTextMessage(trimmed, updatedMessages);
    }
    setIsLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card/80 backdrop-blur-sm">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-2 flex-1">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-foreground">Pixel AI</h1>
            <p className="text-[10px] text-muted-foreground">Your intelligent assistant</p>
          </div>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="icon" onClick={() => setMessages([])}>
            <Trash2 className="w-4 h-4 text-muted-foreground" />
          </Button>
        )}
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 pb-48 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full min-h-[50vh] text-center px-6">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center mb-6 shadow-2xl shadow-violet-500/30">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Hey, I'm Pixel!</h2>
            <p className="text-sm text-muted-foreground max-w-sm mb-6">
              Your AI assistant that can chat, write, translate, code, analyze, and generate images. Ask me anything in any language!
            </p>
            <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
              {[
                "Write a poem about the stars ✨",
                "Explain quantum physics simply 🔬",
                "Translate 'hello' to 10 languages 🌍",
                "Give me a creative story idea 📖",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => { setInput(suggestion); textareaRef.current?.focus(); }}
                  className="text-left p-3 rounded-xl bg-card border border-border text-xs text-muted-foreground hover:border-primary/40 hover:text-foreground transition-all"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] ${msg.role === "user"
              ? "bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-2.5"
              : "bg-card border border-border rounded-2xl rounded-bl-md px-4 py-2.5"
            }`}>
              {msg.role === "assistant" && (
                <div className="flex items-center gap-1.5 mb-1">
                  <Bot className="w-3.5 h-3.5 text-violet-500" />
                  <span className="text-[10px] font-semibold text-violet-500">Pixel</span>
                </div>
              )}
              {msg.isLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{msg.content || "Thinking..."}</span>
                </div>
              ) : (
                <>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  {msg.images && msg.images.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {msg.images.map((imgUrl, i) => (
                        <img
                          key={i}
                          src={imgUrl}
                          alt={`Generated image ${i + 1}`}
                          className="rounded-xl max-w-full border border-border shadow-sm"
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="fixed bottom-16 left-0 right-0 px-4 pb-4 bg-gradient-to-t from-background via-background to-transparent pt-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-1.5 mb-2">
            <button
              onClick={() => setImageMode(false)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                !imageMode ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              💬 Chat
            </button>
            <button
              onClick={() => setImageMode(true)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                imageMode ? "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white" : "bg-card border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              🎨 Image
            </button>
          </div>
          <div className="flex items-end gap-2 bg-card border border-border rounded-2xl p-2 shadow-lg">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={imageMode ? "Describe the image you want to create..." : "Ask Pixel anything in any language..."}
              className="min-h-[40px] max-h-[120px] resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
              rows={1}
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className={`shrink-0 rounded-xl h-9 w-9 ${imageMode ? "bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:opacity-90" : ""}`}
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground text-center mt-1.5">
            {imageMode ? "Pixel will generate an image from your description" : "Pixel supports all languages • Powered by AI"}
          </p>
        </div>
      </div>

      <ModuleSwitcher />
    </div>
  );
};

export default PixelAI;
