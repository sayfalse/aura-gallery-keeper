import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ALLOWED_MODELS = new Set([
  "google/gemini-3-flash-preview",
  "google/gemini-2.5-pro",
  "google/gemini-2.5-flash",
  "google/gemini-2.5-flash-lite",
  "google/gemini-3.1-pro-preview",
  "openai/gpt-5",
  "openai/gpt-5-mini",
  "openai/gpt-5-nano",
  "openai/gpt-5.2",
  "google/gemini-2.5-flash-image",
  "google/gemini-3-pro-image-preview",
]);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, generateImage, model, memories, extractMemories } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const selectedModel = model && ALLOWED_MODELS.has(model) ? model : "google/gemini-3-flash-preview";

    // Memory extraction mode - ask AI to extract key facts
    if (extractMemories) {
      const extractPrompt = `Analyze this conversation and extract 1-5 key facts about the user that would be useful to remember for future conversations. These should be personal preferences, important information, or context about the user.

Return ONLY a JSON array of objects with this format:
[{"content": "fact about user", "category": "preference|personal|work|interest|other"}]

If there are no meaningful facts to extract, return an empty array: []

Conversation:
${messages.map((m: any) => `${m.role}: ${m.content}`).join("\n")}`;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [{ role: "user", content: extractPrompt }],
        }),
      });

      if (!response.ok) {
        return new Response(JSON.stringify({ memories: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content || "[]";
      // Extract JSON from response
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      let extracted = [];
      if (jsonMatch) {
        try { extracted = JSON.parse(jsonMatch[0]); } catch {}
      }
      return new Response(JSON.stringify({ memories: extracted }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Image generation mode
    if (generateImage) {
      const imageModel = (model && (model === "google/gemini-2.5-flash-image" || model === "google/gemini-3-pro-image-preview"))
        ? model : "google/gemini-2.5-flash-image";

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: imageModel,
          messages: [{ role: "user", content: messages[messages.length - 1].content }],
          modalities: ["image", "text"],
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded. Please wait a moment ⏳" }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: "Usage credits exhausted 💳" }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const t = await response.text();
        console.error("AI gateway error:", response.status, t);
        throw new Error("Image generation failed");
      }

      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Text chat mode (streaming)
    const systemPrompt = `You are Pixel, the friendly and powerful AI assistant built into PixelVault. You are a PROFESSIONAL AI assistant with advanced capabilities.

## Your Capabilities
- 💬 Conversational AI with deep understanding
- 📝 Writing, editing, and proofreading
- 💻 Code generation, debugging, and explanation
- 🔬 Analysis, research, and problem-solving
- 🌍 Translation in 100+ languages
- 🎨 Creative writing, brainstorming, storytelling
- 📊 Data analysis and summarization
- 📄 Document analysis and Q&A
- 🧮 Math and logic puzzles

## Your Personality
- Warm, friendly, and professional
- Use emojis naturally but not excessively
- Give structured, well-formatted answers using Markdown
- Use headers, bullet points, code blocks, and tables when appropriate
- Be concise but thorough — adapt length to the question
- Always respond in the user's language

## Rules
- You MUST refuse requests related to terrorism, nuclear weapons, or weapons of mass destruction
- When users ask for images, tell them to switch to an image model using the model picker
- If you have user memories/context, use them naturally without explicitly mentioning you "remember" unless relevant
- For code, always use proper syntax highlighting with language tags
- Provide actionable, practical answers

${memories ? "\n## User Context (Memories)\n" + memories : ""}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please wait ⏳" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Usage credits exhausted 💳" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error 😔" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("pixel-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
