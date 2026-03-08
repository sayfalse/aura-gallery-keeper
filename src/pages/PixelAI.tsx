import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Send, Sparkles, Loader2, Trash2, Bot, ChevronDown, Check, Paperclip, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import ModuleSwitcher from "@/components/ModuleSwitcher";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  images?: string[];
  isLoading?: boolean;
  model?: string;
  fileName?: string;
}

interface AIModel {
  id: string;
  name: string;
  emoji: string;
  description: string;
  category: string;
  supportsImages?: boolean;
}

const AI_MODELS: AIModel[] = [
  // 🔷 Gemini
  { id: "google/gemini-3-flash-preview", name: "Gemini 3 Flash", emoji: "⚡", description: "Fast & capable, next-gen speed", category: "🔷 Gemini" },
  { id: "google/gemini-3.1-pro-preview", name: "Gemini 3.1 Pro", emoji: "🧠", description: "Latest next-gen reasoning", category: "🔷 Gemini" },
  { id: "google/gemini-2.5-pro", name: "Gemini 2.5 Pro", emoji: "💎", description: "Top-tier multimodal + reasoning", category: "🔷 Gemini" },
  { id: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash", emoji: "🚀", description: "Balanced speed & quality", category: "🔷 Gemini" },
  { id: "google/gemini-2.5-flash-lite", name: "Gemini 2.5 Flash Lite", emoji: "🪶", description: "Fastest & cheapest Gemini", category: "🔷 Gemini" },
  // 🟢 ChatGPT / OpenAI
  { id: "openai/gpt-5.2", name: "GPT-5.2", emoji: "🔮", description: "Latest & most capable OpenAI", category: "🟢 ChatGPT" },
  { id: "openai/gpt-5", name: "GPT-5", emoji: "🌟", description: "Powerful all-rounder", category: "🟢 ChatGPT" },
  { id: "openai/gpt-5-mini", name: "GPT-5 Mini", emoji: "✨", description: "Fast & affordable", category: "🟢 ChatGPT" },
  { id: "openai/gpt-5-nano", name: "GPT-5 Nano", emoji: "⚙️", description: "Ultra-fast & efficient", category: "🟢 ChatGPT" },
  // 🖼️ Image Generation
  { id: "google/gemini-3-pro-image-preview", name: "Gemini 3 Pro Image", emoji: "🖌️", description: "Next-gen image creation", category: "🖼️ Image Generation", supportsImages: true },
  { id: "google/gemini-2.5-flash-image", name: "Gemini Flash Image", emoji: "🎨", description: "Fast image generation", category: "🖼️ Image Generation", supportsImages: true },
];

const DEFAULT_MODEL = "google/gemini-3-flash-preview";
const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/pixel-chat`;

// Read file as text
const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
};

const SUPPORTED_EXTENSIONS = [
  ".txt", ".md", ".csv", ".json", ".xml", ".yaml", ".yml", ".toml",
  ".js", ".ts", ".tsx", ".jsx", ".py", ".go", ".rs", ".java", ".c", ".cpp", ".h",
  ".html", ".css", ".scss", ".less", ".sql", ".sh", ".bash", ".zsh",
  ".env", ".gitignore", ".dockerfile", ".log", ".ini", ".cfg", ".conf",
  ".pdf", ".doc", ".docx",
];

const PixelAI = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [attachedFile, setAttachedFile] = useState<{ name: string; content: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentModel = AI_MODELS.find(m => m.id === selectedModel) || AI_MODELS[0];
  const isImageModel = currentModel.supportsImages;

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, 50);
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large. Max 10MB 📁");
      return;
    }

    try {
      const content = await readFileAsText(file);
      setAttachedFile({ name: file.name, content: content.slice(0, 50000) }); // Limit to ~50k chars
      toast.success(`📎 ${file.name} attached!`);
    } catch {
      toast.error("Couldn't read this file 😔");
    }

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const sendTextMessage = async (userContent: string, allMessages: Message[]) => {
    let assistantSoFar = "";
    const assistantId = crypto.randomUUID();
    setMessages(prev => [...prev, { id: assistantId, role: "assistant", content: "", isLoading: true, model: currentModel.name }]);

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({
          messages: allMessages.filter(m => !m.images).map(m => ({ role: m.role, content: m.content })),
          model: selectedModel,
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
          } catch {}
        }
      }

      if (!assistantSoFar) {
        setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: "Couldn't generate a response. Please try again. 😅", isLoading: false } : m));
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to get response");
      setMessages(prev => prev.filter(m => m.id !== assistantId));
    }
  };

  const sendImageMessage = async (prompt: string) => {
    const assistantId = crypto.randomUUID();
    setMessages(prev => [...prev, { id: assistantId, role: "assistant", content: "🎨 Creating your masterpiece...", isLoading: true, model: currentModel.name }]);

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ messages: [{ role: "user", content: prompt }], generateImage: true, model: selectedModel }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || `Error ${resp.status}`);
      }

      const data = await resp.json();
      const images = data.choices?.[0]?.message?.images?.map((img: any) => img.image_url?.url) || [];
      const text = data.choices?.[0]?.message?.content || "Here's your image! ✨";
      setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: text, images, isLoading: false } : m));
    } catch (e: any) {
      toast.error(e.message || "Image generation failed");
      setMessages(prev => prev.filter(m => m.id !== assistantId));
    }
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if ((!trimmed && !attachedFile) || isLoading) return;

    // Build user content with file attachment
    let userContent = trimmed;
    let displayContent = trimmed;
    const fileName = attachedFile?.name;

    if (attachedFile) {
      userContent = `${trimmed ? trimmed + "\n\n" : ""}[Attached file: ${attachedFile.name}]\n\`\`\`\n${attachedFile.content}\n\`\`\``;
      displayContent = trimmed || `📎 Sent document: ${attachedFile.name}`;
    }

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: userContent, fileName };
    const updatedMessages = [...messages, userMsg];

    // Show simplified display in chat
    setMessages(prev => [...prev, { ...userMsg, content: displayContent }]);
    setInput("");
    setAttachedFile(null);
    setIsLoading(true);

    if (isImageModel) await sendImageMessage(userContent);
    else await sendTextMessage(userContent, updatedMessages);
    setIsLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const categories = [...new Set(AI_MODELS.map(m => m.category))];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".txt,.md,.csv,.json,.xml,.yaml,.yml,.toml,.js,.ts,.tsx,.jsx,.py,.go,.rs,.java,.c,.cpp,.h,.html,.css,.scss,.sql,.sh,.log,.ini,.cfg,.conf,.env"
        onChange={handleFileSelect}
      />

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
            <h1 className="text-base font-bold text-foreground">Pixel AI ✨</h1>
            <p className="text-[10px] text-muted-foreground">{currentModel.emoji} {currentModel.name}</p>
          </div>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="icon" onClick={() => setMessages([])}>
            <Trash2 className="w-4 h-4 text-muted-foreground" />
          </Button>
        )}
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 pb-52 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full min-h-[50vh] text-center px-6">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center mb-6 shadow-2xl shadow-violet-500/30">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Hey, I'm Pixel! 👋</h2>
            <p className="text-sm text-muted-foreground max-w-sm mb-6">
              Your AI assistant powered by multiple models. Chat, write, translate, code, analyze documents, and create images! 📄🌍
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
                  {msg.model && <span className="text-[9px] text-muted-foreground">· {msg.model}</span>}
                </div>
              )}
              {msg.role === "user" && msg.fileName && (
                <div className="flex items-center gap-1.5 mb-1.5 px-2 py-1 rounded-lg bg-primary-foreground/10">
                  <FileText className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-medium truncate">{msg.fileName}</span>
                </div>
              )}
              {msg.isLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{msg.content || "Thinking... 🤔"}</span>
                </div>
              ) : (
                <>
                  <div className="text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-pre:my-2 prose-code:text-xs prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                  {msg.images && msg.images.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {msg.images.map((imgUrl, i) => (
                        <img key={i} src={imgUrl} alt={`Generated image ${i + 1}`} className="rounded-xl max-w-full border border-border shadow-sm" />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Model Picker Modal */}
      {showModelPicker && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end justify-center" onClick={() => setShowModelPicker(false)}>
          <div className="w-full max-w-lg bg-card rounded-t-3xl border-t border-border max-h-[75vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>
            <h3 className="text-lg font-bold text-foreground text-center mb-1 px-5">Choose AI Model 🤖</h3>
            <p className="text-xs text-muted-foreground text-center mb-4 px-5">Select the best model for your task</p>
            
            {categories.map(category => (
              <div key={category} className="mb-4">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-5 mb-2">{category}</p>
                <div className="space-y-0.5 px-3">
                  {AI_MODELS.filter(m => m.category === category).map(model => (
                    <button
                      key={model.id}
                      onClick={() => { setSelectedModel(model.id); setShowModelPicker(false); toast.success(`Switched to ${model.name} ${model.emoji}`); }}
                      className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${
                        selectedModel === model.id ? "bg-primary/10" : "hover:bg-accent/60"
                      }`}
                    >
                      <span className="text-xl">{model.emoji}</span>
                      <div className="flex-1 text-left">
                        <p className={`text-sm font-semibold ${selectedModel === model.id ? "text-primary" : "text-foreground"}`}>{model.name}</p>
                        <p className="text-[11px] text-muted-foreground">{model.description}</p>
                      </div>
                      {selectedModel === model.id && <Check className="w-5 h-5 text-primary" />}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div className="h-8" />
          </div>
        </div>
      )}

      {/* Input */}
      <div className="fixed bottom-16 left-0 right-0 px-4 pb-4 bg-gradient-to-t from-background via-background to-transparent pt-6">
        <div className="max-w-3xl mx-auto">
          {/* Model selector pill */}
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={() => setShowModelPicker(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
            >
              <span>{currentModel.emoji}</span>
              <span>{currentModel.name}</span>
              <ChevronDown className="w-3 h-3" />
            </button>
          </div>

          {/* Attached file preview */}
          {attachedFile && (
            <div className="flex items-center gap-2 mb-2 px-3 py-2 rounded-xl bg-card border border-primary/30">
              <FileText className="w-4 h-4 text-primary shrink-0" />
              <span className="text-xs font-medium text-foreground truncate flex-1">{attachedFile.name}</span>
              <button onClick={() => setAttachedFile(null)} className="p-0.5 rounded-full hover:bg-muted">
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
          )}

          <div className="flex items-end gap-2 bg-card border border-border rounded-2xl p-2 shadow-lg">
            {/* Attachment button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              className="shrink-0 h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground"
              disabled={isLoading}
            >
              <Paperclip className="w-4 h-4" />
            </Button>

            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isImageModel ? "Describe the image you want... 🎨" : "Ask Pixel anything... 💬"}
              className="min-h-[40px] max-h-[120px] resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
              rows={1}
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={(!input.trim() && !attachedFile) || isLoading}
              className={`shrink-0 rounded-xl h-9 w-9 ${isImageModel ? "bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:opacity-90" : ""}`}
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground text-center mt-1.5">
            {isImageModel ? "Image generation mode 🖼️" : "📎 Attach documents • 🌐 All languages • ⚡ Powered by AI"}
          </p>
        </div>
      </div>

      <ModuleSwitcher />
    </div>
  );
};

export default PixelAI;
