import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Send, Sparkles, Loader2, Trash2, Bot, ChevronDown, Paperclip, FileText, X, Brain, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import ModuleSwitcher from "@/components/ModuleSwitcher";
import MessageActions from "@/components/pixel-ai/MessageActions";
import MemoryPanel from "@/components/pixel-ai/MemoryPanel";
import ModelPicker from "@/components/pixel-ai/ModelPicker";
import VoiceChat from "@/components/pixel-ai/VoiceChat";
import { useAuth } from "@/contexts/AuthContext";
import {
  getMemories, addMemory, deleteMemory, clearAllMemories,
  formatMemoriesForContext, AIMemory
} from "@/lib/pixelAIService";

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
  { id: "google/gemini-3-flash-preview", name: "Gemini 3 Flash", emoji: "⚡", description: "Fast & capable, next-gen speed", category: "🔷 Gemini" },
  { id: "google/gemini-3.1-pro-preview", name: "Gemini 3.1 Pro", emoji: "🧠", description: "Latest next-gen reasoning", category: "🔷 Gemini" },
  { id: "google/gemini-2.5-pro", name: "Gemini 2.5 Pro", emoji: "💎", description: "Top-tier multimodal + reasoning", category: "🔷 Gemini" },
  { id: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash", emoji: "🚀", description: "Balanced speed & quality", category: "🔷 Gemini" },
  { id: "google/gemini-2.5-flash-lite", name: "Gemini 2.5 Flash Lite", emoji: "🪶", description: "Fastest & cheapest Gemini", category: "🔷 Gemini" },
  { id: "openai/gpt-5.2", name: "GPT-5.2", emoji: "🔮", description: "Latest & most capable OpenAI", category: "🟢 ChatGPT" },
  { id: "openai/gpt-5", name: "GPT-5", emoji: "🌟", description: "Powerful all-rounder", category: "🟢 ChatGPT" },
  { id: "openai/gpt-5-mini", name: "GPT-5 Mini", emoji: "✨", description: "Fast & affordable", category: "🟢 ChatGPT" },
  { id: "openai/gpt-5-nano", name: "GPT-5 Nano", emoji: "⚙️", description: "Ultra-fast & efficient", category: "🟢 ChatGPT" },
  { id: "google/gemini-3-pro-image-preview", name: "Gemini 3 Pro Image", emoji: "🖌️", description: "Next-gen image creation", category: "🖼️ Image Generation", supportsImages: true },
  { id: "google/gemini-2.5-flash-image", name: "Gemini Flash Image", emoji: "🎨", description: "Fast image generation", category: "🖼️ Image Generation", supportsImages: true },
];

const DEFAULT_MODEL = "google/gemini-3-flash-preview";
const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/pixel-chat`;

const readFileAsText = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });

const PixelAI = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [showMemory, setShowMemory] = useState(false);
  const [showVoice, setShowVoice] = useState(false);
  const [attachedFile, setAttachedFile] = useState<{ name: string; content: string } | null>(null);
  const [memories, setMemories] = useState<AIMemory[]>([]);
  const [lastVoiceResponse, setLastVoiceResponse] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentModel = AI_MODELS.find(m => m.id === selectedModel) || AI_MODELS[0];
  const isImageModel = currentModel.supportsImages;

  // Load memories
  useEffect(() => {
    if (user) getMemories(user.id).then(setMemories);
  }, [user]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, 50);
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("File too large. Max 10MB 📁"); return; }
    try {
      const content = await readFileAsText(file);
      setAttachedFile({ name: file.name, content: content.slice(0, 50000) });
      toast.success(`📎 ${file.name} attached!`);
    } catch { toast.error("Couldn't read this file 😔"); }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Extract memories from conversation (runs in background)
  const extractMemories = useCallback(async (msgs: Message[]) => {
    if (!user || msgs.length < 4) return; // Need at least 2 exchanges
    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({
          messages: msgs.slice(-10).map(m => ({ role: m.role, content: m.content.slice(0, 500) })),
          extractMemories: true,
        }),
      });
      if (!resp.ok) return;
      const data = await resp.json();
      if (data.memories?.length > 0) {
        for (const mem of data.memories) {
          await addMemory(user.id, mem.content, mem.category || "general");
        }
        const updated = await getMemories(user.id);
        setMemories(updated);
      }
    } catch { /* silent fail */ }
  }, [user]);

  const sendTextMessage = async (userContent: string, allMessages: Message[]) => {
    let assistantSoFar = "";
    const assistantId = crypto.randomUUID();
    setMessages(prev => [...prev, { id: assistantId, role: "assistant", content: "", isLoading: true, model: currentModel.name }]);

    try {
      const memoryContext = formatMemoriesForContext(memories);
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({
          messages: allMessages.filter(m => !m.images).map(m => ({ role: m.role, content: m.content })),
          model: selectedModel,
          memories: memoryContext || undefined,
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
      } else {
        setLastVoiceResponse(assistantSoFar);
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

  const handleSend = async (overrideContent?: string) => {
    const trimmed = (overrideContent || input).trim();
    if ((!trimmed && !attachedFile) || isLoading) return;

    let userContent = trimmed;
    let displayContent = trimmed;
    const fileName = attachedFile?.name;

    if (attachedFile) {
      userContent = `${trimmed ? trimmed + "\n\n" : ""}[Attached file: ${attachedFile.name}]\n\`\`\`\n${attachedFile.content}\n\`\`\``;
      displayContent = trimmed || `📎 Sent document: ${attachedFile.name}`;
    }

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: userContent, fileName };
    const displayMsg: Message = { ...userMsg, content: displayContent };
    const updatedMessages = [...messages, userMsg];

    setMessages(prev => [...prev, displayMsg]);
    setInput("");
    setAttachedFile(null);
    setIsLoading(true);

    if (isImageModel) await sendImageMessage(userContent);
    else await sendTextMessage(userContent, updatedMessages);

    setIsLoading(false);

    // Background memory extraction
    const allMsgs = [...updatedMessages];
    setTimeout(() => extractMemories(allMsgs), 2000);
  };

  const handleRegenerate = useCallback(async () => {
    if (isLoading || messages.length < 2) return;
    // Remove last assistant message
    const newMsgs = messages.slice(0, -1);
    setMessages(newMsgs);
    setIsLoading(true);
    await sendTextMessage(newMsgs[newMsgs.length - 1].content, newMsgs);
    setIsLoading(false);
  }, [messages, isLoading, selectedModel, memories]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleClearChat = () => {
    setMessages([]);
    setLastVoiceResponse("");
    toast.success("Chat cleared! 🗑️");
  };

  const handleMemoryDelete = async (id: string) => {
    await deleteMemory(id);
    setMemories(prev => prev.filter(m => m.id !== id));
    toast.success("Memory deleted 🗑️");
  };

  const handleMemoryClearAll = async () => {
    if (!user) return;
    await clearAllMemories(user.id);
    setMemories([]);
    toast.success("All memories cleared 🧹");
  };

  const handleAddMemory = async (content: string, category: string) => {
    if (!user) return;
    await addMemory(user.id, content, category);
    const updated = await getMemories(user.id);
    setMemories(updated);
    toast.success("Memory saved! 🧠");
  };

  const handleVoiceTranscript = (text: string) => {
    handleSend(text);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
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
        <Button variant="ghost" size="icon" onClick={() => setShowMemory(true)} className="relative">
          <Brain className="w-4 h-4 text-muted-foreground" />
          {memories.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary text-[8px] text-primary-foreground flex items-center justify-center font-bold">
              {memories.length}
            </span>
          )}
        </Button>
        {messages.length > 0 && (
          <Button variant="ghost" size="icon" onClick={handleClearChat}>
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
            <p className="text-sm text-muted-foreground max-w-sm mb-2">
              Your professional AI assistant. Chat, code, write, translate, analyze documents, generate images, and more!
            </p>
            {memories.length > 0 && (
              <p className="text-xs text-primary mb-4">🧠 {memories.length} memories loaded</p>
            )}
            <div className="grid grid-cols-2 gap-2 w-full max-w-sm mb-4">
              {[
                "Write a poem about the stars ✨",
                "Explain quantum physics simply 🔬",
                "Help me debug my code 💻",
                "Summarize a long article 📄",
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
            <button
              onClick={() => setShowVoice(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-sm font-semibold shadow-lg shadow-violet-500/20 hover:opacity-90 transition-opacity"
            >
              <Mic className="w-4 h-4" />
              Start Voice Chat 🎙️
            </button>
          </div>
        )}

        {messages.map((msg, i) => {
          const isLastAssistant = msg.role === "assistant" && i === messages.length - 1;
          return (
            <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} group`}>
              <div className={`max-w-[85%] ${msg.role === "user"
                ? "bg-muted text-foreground rounded-2xl rounded-br-md px-4 py-2.5"
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
                  <div className="flex items-center gap-1.5 mb-1.5 px-2 py-1 rounded-lg bg-foreground/10">
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
                        {msg.images.map((imgUrl, idx) => (
                          <img key={idx} src={imgUrl} alt={`Generated ${idx + 1}`} className="rounded-xl max-w-full border border-border shadow-sm" />
                        ))}
                      </div>
                    )}
                  </>
                )}
                {/* Message actions (copy, speak, regenerate) */}
                {!msg.isLoading && (
                  <MessageActions
                    content={msg.content}
                    role={msg.role}
                    onRegenerate={isLastAssistant ? handleRegenerate : undefined}
                    isLastAssistant={isLastAssistant}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Model Picker */}
      {showModelPicker && (
        <ModelPicker
          models={AI_MODELS}
          selectedModel={selectedModel}
          onSelect={(id) => { setSelectedModel(id); setShowModelPicker(false); toast.success(`Switched to ${AI_MODELS.find(m => m.id === id)?.name} ${AI_MODELS.find(m => m.id === id)?.emoji}`); }}
          onClose={() => setShowModelPicker(false)}
        />
      )}

      {/* Memory Panel */}
      {showMemory && (
        <MemoryPanel
          memories={memories}
          onClose={() => setShowMemory(false)}
          onDelete={handleMemoryDelete}
          onClearAll={handleMemoryClearAll}
          onAddMemory={handleAddMemory}
        />
      )}

      {/* Voice Chat */}
      {showVoice && (
        <VoiceChat
          onTranscript={handleVoiceTranscript}
          onClose={() => setShowVoice(false)}
          isProcessing={isLoading}
          lastResponse={lastVoiceResponse}
        />
      )}

      {/* Input */}
      <div className="fixed bottom-16 left-0 right-0 px-4 pb-4 bg-gradient-to-t from-background via-background to-transparent pt-6">
        <div className="max-w-3xl mx-auto">
          {/* Top row: model + memory + voice */}
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={() => setShowModelPicker(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
            >
              <span>{currentModel.emoji}</span>
              <span className="max-w-[100px] truncate">{currentModel.name}</span>
              <ChevronDown className="w-3 h-3" />
            </button>
            <button
              onClick={() => setShowVoice(true)}
              className="p-1.5 rounded-full bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
              title="Voice Chat"
            >
              <Mic className="w-3.5 h-3.5" />
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
            <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} className="shrink-0 h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground" disabled={isLoading}>
              <Paperclip className="w-4 h-4" />
            </Button>
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isImageModel ? "Describe the image... 🎨" : "Ask Pixel anything... 💬"}
              className="min-h-[40px] max-h-[120px] resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
              rows={1}
            />
            <Button
              size="icon"
              onClick={() => handleSend()}
              disabled={(!input.trim() && !attachedFile) || isLoading}
              className={`shrink-0 rounded-xl h-9 w-9 ${isImageModel ? "bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:opacity-90" : ""}`}
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground text-center mt-1.5">
            © All Rights Reserved • Pixel AI ✨
          </p>
        </div>
      </div>

      <ModuleSwitcher />
    </div>
  );
};

export default PixelAI;
