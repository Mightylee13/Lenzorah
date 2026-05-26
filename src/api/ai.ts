/**
 *  Lenzorah Entertainment AI Service
 * Powered by OpenRouter
 */

const OPENROUTER_API_KEY =
  "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";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

interface AIChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIResponse {
  text: string;
  suggestions: string[];
}

// ============================================
// FAST FALLBACK MODEL LIST
// ============================================

const AI_MODELS = [
  "google/gemini-2.5-flash-lite",
  "google/gemini-2.5-flash",

  "meta-llama/llama-4-scout-17b-16e-instruct:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "meta-llama/llama-3.1-405b-instruct:free",
  "meta-llama/llama-3.1-70b-instruct:free",
  "meta-llama/llama-3.1-8b-instruct:free",

  "moonshotai/kimi-k2-instruct:free",

  "x-ai/grok-4-fast:free",
  "x-ai/grok-3-mini-beta",

  "deepseek/deepseek-chat-v3:free",
  "deepseek/deepseek-r1:free",

  "qwen/qwen3-coder:free",
  "qwen/qwen-2.5-72b-instruct:free",
  "qwen/qwen-2.5-7b-instruct:free",

  "microsoft/phi-4-reasoning-plus:free",

  "nvidia/nemotron-4-340b-instruct",
  "nvidia/nemotron-mini-4b-instruct",

  "openchat/openchat-7b",

  "openrouter/auto",
];

// ============================================
// OPENROUTER REQUEST
// ============================================

async function callOpenRouter(
  messages: AIChatMessage[],
  maxTokens = 500,
): Promise<string> {
  let lastError = "";

  for (const model of AI_MODELS) {
    try {
      console.log("TRYING MODEL:", model);

      const res = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": window.location.origin,
          "X-Title": " Lenzorah Entertainment AI",
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: maxTokens,
          temperature: 0.7,
          stream: false,
        }),
      });

      if (!res.ok) {
        const err = await res.text();

        console.error(`MODEL FAILED: ${model}`, err);

        lastError = err;

        continue;
      }

      const data = await res.json();

      console.log(`MODEL SUCCESS: ${model}`, data);

      const content = data?.choices?.[0]?.message?.content;

      if (content && content.trim()) {
        return content.trim();
      }
    } catch (err) {
      console.error(`MODEL CRASHED: ${model}`, err);
    }
  }

  throw new Error(`All AI models failed.\n${lastError}`);
}

// ============================================
// CLEAN TITLES
// ============================================

function cleanTitles(response: string): string[] {
  let suggestions = response
    .split("\n")
    .map((line) =>
      line
        .replace(/^[-•*\d.)\s]+/, "")
        .replace(/"/g, "")
        .replace(/'/g, "")
        .trim(),
    )
    .filter((line) => {
      const lower = line.toLowerCase();

      return (
        line.length > 1 &&
        line.length < 80 &&
        !lower.includes("recommend") &&
        !lower.includes("movie") &&
        !lower.includes("show") &&
        !lower.includes("series") &&
        !lower.includes("watch") &&
        !lower.includes("here are") &&
        !lower.includes("based on")
      );
    });

  suggestions = [...new Set(suggestions)];

  return suggestions.slice(0, 12);
}

// ============================================
// AI SEARCH
// ============================================

export async function aiSearch(query: string): Promise<AIResponse> {
  const messages: AIChatMessage[] = [
    {
      role: "system",
      content: `
You are  LENZORAH AI.

You ONLY return movie or TV titles.

STRICT RULES:
- One title per line
- No numbering
- No markdown
- No explanation
- No intro text
- No categories

Example:

Inception
Breaking Bad
Dark
Interstellar
`,
    },
    {
      role: "user",
      content: query,
    },
  ];

  const response = await callOpenRouter(messages, 250);

  console.log(" LENZORAH AI SEARCH RESPONSE:", response);

  let suggestions = cleanTitles(response);

  if (suggestions.length === 0) {
    suggestions = [
      "Inception",
      "Interstellar",
      "Dark",
      "Breaking Bad",
      "John Wick",
      "The Batman",
      "The Boys",
    ];
  }

  return {
    text: ` LENZORAH AI recommendations for "${query}"`,
    suggestions,
  };
}

// ============================================
// AI RECOMMEND
// ============================================

export async function aiRecommend(context: {
  mood?: string;
  timeAvailable?: string;
  recentlyWatched?: string[];
  preferences?: string;
}): Promise<AIResponse> {
  const contextParts: string[] = [];

  if (context.mood) {
    contextParts.push(`Mood: ${context.mood}`);
  }

  if (context.timeAvailable) {
    contextParts.push(`Time Available: ${context.timeAvailable}`);
  }

  if (context.recentlyWatched?.length) {
    contextParts.push(
      `Recently Watched: ${context.recentlyWatched.join(", ")}`,
    );
  }

  if (context.preferences) {
    contextParts.push(`Preferences: ${context.preferences}`);
  }

  const messages: AIChatMessage[] = [
    {
      role: "system",
      content: `
You are  LENZORAH AI.

Return ONLY movie and TV titles.

STRICT RULES:
- One title per line
- No numbering
- No explanations
- No markdown
`,
    },
    {
      role: "user",
      content:
        contextParts.length > 0
          ? contextParts.join("\n")
          : "Recommend something amazing to watch tonight",
    },
  ];

  const response = await callOpenRouter(messages, 250);

  console.log(" LENZORAH AI RECOMMEND RESPONSE:", response);

  let suggestions = cleanTitles(response);

  if (suggestions.length === 0) {
    suggestions = [
      "The Dark Knight",
      "Attack on Titan",
      "Interstellar",
      "The Boys",
      "Peaky Blinders",
    ];
  }

  return {
    text: " LENZORAH AI recommendations for you",
    suggestions,
  };
}

// ============================================
// AI RECAP
// ============================================

export async function aiRecap(
  title: string,
  season: number,
  episode: number,
): Promise<string> {
  const messages: AIChatMessage[] = [
    {
      role: "system",
      content:
        "You are a concise TV recap assistant. Keep it spoiler-safe and short.",
    },
    {
      role: "user",
      content: `Give me a quick recap before watching "${title}" Season ${season} Episode ${episode}`,
    },
  ];

  const response = await callOpenRouter(messages, 200);

  return response;
}

// ============================================
// AI TRIVIA
// ============================================

export async function aiGetTrivia(title: string): Promise<string[]> {
  const messages: AIChatMessage[] = [
    {
      role: "system",
      content: `
Return ONLY a JSON array.

Example:
[
  "Fact 1",
  "Fact 2"
]
`,
    },
    {
      role: "user",
      content: `Give trivia for "${title}"`,
    },
  ];

  const response = await callOpenRouter(messages, 300);

  try {
    const match = response.match(/\[.*\]/s);

    if (match) {
      return JSON.parse(match[0]);
    }

    return JSON.parse(response);
  } catch {
    return response
      .split("\n")
      .map((x) => x.replace(/^[-•*\d.)\s]+/, "").trim())
      .filter(Boolean);
  }
}
