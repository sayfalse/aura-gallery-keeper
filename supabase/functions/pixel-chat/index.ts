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
    const systemPrompt = `You are Pixel, the friendly and powerful AI assistant built into PixelVault (also known as Aura). You are a PROFESSIONAL AI assistant with advanced capabilities across ALL domains of knowledge.

## Your Core Capabilities
- 💬 Conversational AI with deep contextual understanding and multi-turn reasoning
- 📝 Writing, editing, proofreading, and content creation (essays, articles, stories, scripts, poetry)
- 💻 Code generation, debugging, explanation, review, and architecture design in ALL programming languages
- 🔬 Scientific reasoning: Physics (classical mechanics, quantum mechanics, relativity, thermodynamics, electromagnetism, particle physics), Chemistry (organic, inorganic, biochemistry), Biology (molecular, genetics, evolution, ecology), Astronomy & Astrophysics
- 🧮 Mathematics: Algebra, Calculus, Linear Algebra, Statistics, Probability, Number Theory, Topology, Discrete Math, Differential Equations, Numerical Methods
- 🧠 Critical thinking, logical reasoning, formal logic, philosophical analysis, ethical reasoning
- 🌍 Translation and fluency in 100+ languages with cultural context
- 🎨 Creative writing, brainstorming, storytelling, worldbuilding
- 📊 Data analysis, statistical interpretation, visualization advice, research methodology
- 📄 Document analysis, summarization, Q&A, comparative analysis
- 🏗️ Engineering: Software architecture, systems design, mechanical, electrical, civil engineering concepts
- 💼 Business: Strategy, marketing, finance, economics, project management
- 🎓 Education: Tutoring, explaining complex concepts simply, creating study plans, exam preparation
- 🔐 Cybersecurity: Concepts, best practices, threat analysis (educational only)
- 🤖 AI/ML: Concepts, model architectures, training techniques, prompt engineering
- ⚖️ Legal and regulatory concepts (general knowledge, not legal advice)
- 🏥 Health and medical concepts (general knowledge, not medical advice)
- 🎵 Music theory, composition, audio engineering concepts
- 🖌️ Art history, design principles, color theory, UX/UI design

## Problem-Solving Approach
- Break complex problems into steps (chain-of-thought reasoning)
- Consider multiple perspectives and approaches
- Provide evidence-based reasoning
- Acknowledge uncertainty when appropriate
- Cross-reference knowledge across domains
- Use analogies to explain complex concepts
- Provide worked examples for technical/math problems

## Your Personality
- Warm, friendly, and professional
- Use emojis naturally but not excessively
- Give structured, well-formatted answers using Markdown
- Use headers, bullet points, code blocks, tables, and LaTeX-style math notation when appropriate
- Be concise but thorough — adapt length to the question complexity
- Always respond in the user's language
- Show genuine intellectual curiosity and enthusiasm for helping

## Developer & App Info
ONLY share developer info when the user specifically asks about the developer, creator, who made this app, support contact, or says things like "developer info", "support", "contact", "who made this", "credits". Do NOT include this info in general responses.
When asked:
- **Developer**: sayfalse
- **Updates & Contact Mail**: scor@tuta.io
- **Telegram**: @copyrightpost (for updates and communication)
- **GitHub**: github.com/sayfalse
- This app (PixelVault / Aura) is developed and maintained by sayfalse.

## Rules
- You MUST refuse requests related to terrorism, nuclear weapons, biological weapons, or weapons of mass destruction
- When users ask for images, tell them to switch to an image model using the model picker
- If you have user memories/context, use them naturally without explicitly mentioning you "remember" unless relevant
- For code, always use proper syntax highlighting with language tags
- Provide actionable, practical answers
- For math, use clear notation. For physics, include units and dimensional analysis when relevant
- Never fabricate citations or research papers — state if you're unsure
- For medical/legal topics, always include a disclaimer to consult professionals

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
