/**
 * RUNFlix AI Service — Powered by OpenRouter
 * Provides AI-powered movie search, recommendations, and summaries.
 */

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY as
  | string
  | undefined;
const OPENROUTER_URL = import.meta.env.VITE_OPENROUTER_URL as
  | string
  | undefined;

function assertOpenRouterEnv(key: unknown): asserts key is string {
  if (!OPENROUTER_API_KEY || !OPENROUTER_URL) {
    throw new Error(
      "Missing OpenRouter env. Set VITE_OPENROUTER_API_KEY and VITE_OPENROUTER_URL in .env.",
    );
  }
}

interface AIChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIResponse {
  text: string;
  suggestions: string[];
}

async function callOpenRouter(
  messages: AIChatMessage[],
  maxTokens = 500,
): Promise<string> {
  assertOpenRouterEnv(OPENROUTER_API_KEY);
  const res = await fetch(OPENROUTER_URL as string, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": window.location.origin,
      "X-Title": "Lenzorah AI",
    },
    body: JSON.stringify({
      model: "google/gemini-2.0-flash-001",
      messages,
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`AI request failed: ${res.status} ${errText}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

/**
 * AI-powered natural language movie search.
 * Takes a natural language query like "movies like john wick but darker"
 * and returns search keywords the user can use.
 */
export async function aiSearch(query: string): Promise<AIResponse> {
  const messages: AIChatMessage[] = [
    {
      role: "system",
      content: `You are Lenzorah AI, a movie and TV recommendation assistant. 
When the user describes what they want to watch in natural language, you MUST respond with:
1. A brief, engaging recommendation paragraph (2-3 sentences max).
2. A JSON array of 5-8 specific movie/TV show titles that match their request.

Format your response EXACTLY like this:
RECOMMENDATION: [Your brief recommendation text here]
TITLES: ["Movie 1", "Movie 2", "Movie 3", "Movie 4", "Movie 5"]

Be specific with real movie titles. Focus on quality matches. Keep it concise.`,
    },
    {
      role: "user",
      content: query,
    },
  ];

  const response = await callOpenRouter(messages);

  // Parse the response
  const recMatch = response.match(/RECOMMENDATION:\s*(.+?)(?=TITLES:|$)/s);
  const titlesMatch = response.match(/TITLES:\s*(\[.*?\])/s);

  const recommendation = recMatch?.[1]?.trim() || response;
  let suggestions: string[] = [];

  if (titlesMatch?.[1]) {
    try {
      suggestions = JSON.parse(titlesMatch[1]);
    } catch {
      // Fallback: extract quoted strings
      suggestions = [...titlesMatch[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
    }
  }

  return {
    text: recommendation,
    suggestions,
  };
}

/**
 * "What should I watch tonight?" — mood/time/context-based suggestions
 */
export async function aiRecommend(context: {
  mood?: string;
  timeAvailable?: string;
  recentlyWatched?: string[];
  preferences?: string;
}): Promise<AIResponse> {
  const contextParts: string[] = [];
  if (context.mood) contextParts.push(`Mood: ${context.mood}`);
  if (context.timeAvailable)
    contextParts.push(`Time available: ${context.timeAvailable}`);
  if (context.recentlyWatched?.length)
    contextParts.push(
      `Recently watched: ${context.recentlyWatched.join(", ")}`,
    );
  if (context.preferences)
    contextParts.push(`Preferences: ${context.preferences}`);

  const messages: AIChatMessage[] = [
    {
      role: "system",
      content: `You are Lenzorah AI, a personal movie recommendation assistant. Based on the user's context, suggest what they should watch. Be enthusiastic and specific.

Format your response EXACTLY like this:
RECOMMENDATION: [Your personalized recommendation with brief reasons, 2-3 sentences]
TITLES: ["Movie 1", "Movie 2", "Movie 3", "Movie 4", "Movie 5"]

Use real movie/show titles only.`,
    },
    {
      role: "user",
      content:
        contextParts.length > 0
          ? `What should I watch? Here's my context:\n${contextParts.join("\n")}`
          : "What should I watch tonight? Surprise me with something great!",
    },
  ];

  const response = await callOpenRouter(messages);

  const recMatch = response.match(/RECOMMENDATION:\s*(.+?)(?=TITLES:|$)/s);
  const titlesMatch = response.match(/TITLES:\s*(\[.*?\])/s);

  const recommendation = recMatch?.[1]?.trim() || response;
  let suggestions: string[] = [];

  if (titlesMatch?.[1]) {
    try {
      suggestions = JSON.parse(titlesMatch[1]);
    } catch {
      suggestions = [...titlesMatch[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
    }
  }

  return { text: recommendation, suggestions };
}

/**
 * AI Episode Recap — summarize what happened in previous episodes
 */
export async function aiRecap(
  title: string,
  season: number,
  episode: number,
): Promise<string> {
  const messages: AIChatMessage[] = [
    {
      role: "system",
      content:
        "You are a concise TV episode recap assistant. Give a brief, spoiler-aware recap of previous episodes to help the viewer catch up. Keep it under 100 words. Be engaging and avoid major spoilers.",
    },
    {
      role: "user",
      content: `Give me a quick recap before watching "${title}" Season ${season}, Episode ${episode}. What should I remember from earlier episodes?`,
    },
  ];

  return callOpenRouter(messages, 200);
}

/**
 * AI Trivia — generate fun facts about a movie or show
 */
export async function aiGetTrivia(title: string): Promise<string[]> {
  const messages: AIChatMessage[] = [
    {
      role: "system",
      content:
        "You are a movie trivia expert. Provide exactly 3 to 5 very interesting, fun, or mind-blowing behind-the-scenes facts or trivia about the given movie or TV show. Format your response as a JSON array of strings. ONLY output the JSON array, nothing else.",
    },
    {
      role: "user",
      content: `Give me trivia for "${title}".`,
    },
  ];

  const response = await callOpenRouter(messages, 300);
  try {
    const jsonMatch = response.match(/\[.*?\]/s);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return JSON.parse(response);
  } catch {
    // Fallback if parsing fails
    return response
      .split("\n")
      .map((line) => line.replace(/^-\s*/, "").trim())
      .filter(Boolean);
  }
}
