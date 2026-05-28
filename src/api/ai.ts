/**
 * Lenzorah Entertainment AI Service
 *
 * Primary:   Runflix Overchat — https://runflix.name.ng/api/ai/overchat (deepseek)
 * Backup 1:  Groq             — llama-3.1-8b-instant
 * Backup 2:  Gemini           — gemini-2.5-flash
 *
 * Chain: Primary → Backup 1 → Backup 2
 * Auto-switches silently on any failure (rate limit, network, 4xx/5xx).
 */

// ── Config ────────────────────────────────────────────────────────────────────
const OVERCHAT_BASE = "https://runflix.name.ng/api/ai/overchat";
const OVERCHAT_MODEL = "deepseek";

const GROQ_KEY = import.meta.env.VITE_GROQ_KEY as string;
const GROQ_BASE =
  (import.meta.env.VITE_GROQ_BASE as string) ??
  "https://api.groq.com/openai/v1";
const GROQ_MODEL = "llama-3.1-8b-instant";

const GEMINI_KEY = import.meta.env.VITE_GEMINI_KEY as string;
const GEMINI_BASE =
  (import.meta.env.VITE_GEMINI_BASE as string) ??
  "https://generativelanguage.googleapis.com/v1beta/openai";
const GEMINI_MODEL = "gemini-2.5-flash";

// ── Types ─────────────────────────────────────────────────────────────────────
interface AIChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIResponse {
  text: string;
  suggestions: string[];
}

// ── Provider 1: Runflix Overchat ──────────────────────────────────────────────
// Collapses the message array into a single prompt string:
//   [system]\n\n[user turn 1]\n[assistant turn 1]\n[user turn 2]…
async function callOverchat(
  messages: AIChatMessage[],
  _maxTokens: number,
): Promise<string> {
  // Build a flat prompt from the message history
  const prompt = messages
    .map((m) => {
      if (m.role === "system") return m.content;
      if (m.role === "user") return `User: ${m.content}`;
      return `Assistant: ${m.content}`;
    })
    .join("\n\n");

  const url = `${OVERCHAT_BASE}?model=${encodeURIComponent(OVERCHAT_MODEL)}&q=${encodeURIComponent(prompt)}`;

  const res = await fetch(url);

  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    throw Object.assign(new Error(err), { status: res.status });
  }

  const data = await res.json();

  // Handle common response shapes: { response }, { answer }, { text }, { result }, plain string
  const content =
    data?.response ??
    data?.answer ??
    data?.text ??
    data?.result ??
    (typeof data === "string" ? data : null);

  if (!content?.trim()) throw new Error("Empty response from Overchat");
  return content.trim();
}

// ── Provider 2 & 3: OpenAI-compatible (Groq / Gemini) ────────────────────────
async function callOpenAICompatible(
  base: string,
  key: string,
  model: string,
  messages: AIChatMessage[],
  maxTokens: number,
): Promise<string> {
  const res = await fetch(`${base.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
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
    const err = await res.text().catch(() => res.statusText);
    throw Object.assign(new Error(err), { status: res.status });
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content?.trim()) throw new Error("Empty response from AI");
  return content.trim();
}

// ── Main caller: Overchat → Groq → Gemini ────────────────────────────────────
async function callAI(
  messages: AIChatMessage[],
  maxTokens = 500,
): Promise<string> {
  // 1️⃣ Primary — Runflix Overchat (deepseek)
  try {
    return await callOverchat(messages, maxTokens);
  } catch (e: any) {
    console.warn("[AI] Overchat failed, trying Groq:", e?.message);
  }

  // 2️⃣ Backup 1 — Groq
  try {
    return await callOpenAICompatible(
      GROQ_BASE,
      GROQ_KEY,
      GROQ_MODEL,
      messages,
      maxTokens,
    );
  } catch (e: any) {
    console.warn("[AI] Groq failed, trying Gemini:", e?.message);
  }

  // 3️⃣ Backup 2 — Gemini
  try {
    return await callOpenAICompatible(
      GEMINI_BASE,
      GEMINI_KEY,
      GEMINI_MODEL,
      messages,
      maxTokens,
    );
  } catch (e: any) {
    console.error("[AI] All providers failed:", e?.message);
    throw new Error("AI service temporarily unavailable.");
  }
}

// ── Clean title list from raw AI response ─────────────────────────────────────
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

// ============================================================
// AI SEARCH
// ============================================================
export async function aiSearch(query: string): Promise<AIResponse> {
  const messages: AIChatMessage[] = [
    {
      role: "system",
      content: `
You are LENZORAH AI.

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

  const response = await callAI(messages, 250);

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
    text: `LENZORAH AI recommendations for "${query}"`,
    suggestions,
  };
}

// ============================================================
// AI RECOMMEND
// ============================================================
export async function aiRecommend(context: {
  mood?: string;
  timeAvailable?: string;
  recentlyWatched?: string[];
  preferences?: string;
}): Promise<AIResponse> {
  const contextParts: string[] = [];

  if (context.mood) contextParts.push(`Mood: ${context.mood}`);
  if (context.timeAvailable)
    contextParts.push(`Time Available: ${context.timeAvailable}`);
  if (context.recentlyWatched?.length)
    contextParts.push(
      `Recently Watched: ${context.recentlyWatched.join(", ")}`,
    );
  if (context.preferences)
    contextParts.push(`Preferences: ${context.preferences}`);

  const messages: AIChatMessage[] = [
    {
      role: "system",
      content: `
You are LENZORAH AI.

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

  const response = await callAI(messages, 250);

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
    text: "LENZORAH AI recommendations for you",
    suggestions,
  };
}

// ============================================================
// AI RECAP
// ============================================================
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

  return await callAI(messages, 200);
}

// ============================================================
// AI TRIVIA
// ============================================================
export async function aiGetTrivia(title: string): Promise<string[]> {
  const messages: AIChatMessage[] = [
    {
      role: "system",
      content: `
Return ONLY a JSON array of trivia facts.

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

  const response = await callAI(messages, 300);

  try {
    const match = response.match(/\[.*\]/s);
    if (match) return JSON.parse(match[0]);
    return JSON.parse(response);
  } catch {
    return response
      .split("\n")
      .map((x) => x.replace(/^[-•*\d.)\s]+/, "").trim())
      .filter(Boolean);
  }
}

// ============================================================
// AI JUDGE — "Should I Watch This?"
// ============================================================
export async function aijudge(title: string): Promise<{
  verdict: "watch" | "skip" | "maybe";
  score: number;
  reason: string;
  watchIf: string;
  skipIf: string;
}> {
  const messages: AIChatMessage[] = [
    {
      role: "system",
      content: `
You are a brutally honest movie/show critic.
Return ONLY a JSON object. No markdown, no preamble.

Format:
{
  "verdict": "watch" | "skip" | "maybe",
  "score": number from 1-10,
  "reason": "One punchy sentence verdict",
  "watchIf": "Short phrase describing who should watch it",
  "skipIf": "Short phrase describing who should skip it"
}
`,
    },
    {
      role: "user",
      content: `Should I watch "${title}"?`,
    },
  ];

  const response = await callAI(messages, 200);

  try {
    const match = response.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    return JSON.parse(response);
  } catch {
    return {
      verdict: "maybe",
      score: 7,
      reason: `"${title}" is worth checking out depending on your taste.`,
      watchIf: "You enjoy this type of content",
      skipIf: "It's not your usual genre",
    };
  }
}

// ============================================================
// AI CONTENT WARNING
// ============================================================
export async function aiContentWarning(title: string): Promise<{
  title: string;
  ratings: { category: string; level: number }[];
  summary: string;
}> {
  const messages: AIChatMessage[] = [
    {
      role: "system",
      content: `
You are a content advisory system.
Return ONLY a JSON object. No markdown, no preamble.

Format:
{
  "title": "movie/show title",
  "ratings": [
    { "category": "Violence",  "level": 0-5 },
    { "category": "Language",  "level": 0-5 },
    { "category": "Romance",   "level": 0-5 },
    { "category": "Intensity", "level": 0-5 }
  ],
  "summary": "One sentence describing what to expect overall"
}

Where 0 = none, 1 = mild, 3 = moderate, 5 = extreme.
`,
    },
    {
      role: "user",
      content: `Content advisory for "${title}"`,
    },
  ];

  const response = await callAI(messages, 250);

  try {
    const match = response.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    return JSON.parse(response);
  } catch {
    return {
      title,
      ratings: [
        { category: "Violence", level: 2 },
        { category: "Language", level: 2 },
        { category: "Romance", level: 1 },
        { category: "Intensity", level: 3 },
      ],
      summary: `"${title}" contains content suitable for mature audiences.`,
    };
  }
}

// ============================================================
// AI MOOD MATCH
// Returns titles that match a user's current mood/feeling.
// Usage: aiMoodMatch("sad") or aiMoodMatch("hyped and energetic")
// ============================================================
export async function aiMoodMatch(mood: string): Promise<AIResponse> {
  const messages: AIChatMessage[] = [
    {
      role: "system",
      content: `
You are LENZORAH AI, a movie and TV recommendation engine.

The user describes their current mood or feeling.
Return ONLY movie and TV titles that perfectly match that mood.

STRICT RULES:
- One title per line
- No numbering, no bullets
- No explanations
- No markdown
- Return 8 to 12 titles
- Mix movies and TV shows

Example output for mood "sad and emotional":
A Beautiful Mind
Manchester by the Sea
This Is Us
Her
The Pursuit of Happyness
Blue Valentine
`,
    },
    {
      role: "user",
      content: `My mood right now: ${mood}`,
    },
  ];

  const response = await callAI(messages, 300);

  let suggestions = cleanTitles(response);

  if (suggestions.length === 0) {
    suggestions = [
      "The Pursuit of Happyness",
      "Her",
      "Eternal Sunshine of the Spotless Mind",
      "Inside Out",
      "Good Will Hunting",
    ];
  }

  return {
    text: `LENZORAH AI picks for when you're feeling "${mood}"`,
    suggestions,
  };
}

// ============================================================
// AI SIMILAR TO
// Returns titles similar to a given movie or show.
// Usage: aiSimilarTo("Squid Game")
// ============================================================
export async function aiSimilarTo(title: string): Promise<AIResponse> {
  const messages: AIChatMessage[] = [
    {
      role: "system",
      content: `
You are LENZORAH AI, a movie and TV recommendation engine.

The user loved a specific title and wants similar content.
Analyse the tone, genre, pacing, themes, and audience of the given title.
Return ONLY titles that genuinely feel similar — not just same genre.

STRICT RULES:
- One title per line
- No numbering, no bullets
- No explanations or reasons
- No markdown
- Return exactly 10 titles
- Do NOT include the original title in the list
`,
    },
    {
      role: "user",
      content: `I loved "${title}". What should I watch next?`,
    },
  ];

  const response = await callAI(messages, 300);

  let suggestions = cleanTitles(response);

  if (suggestions.length === 0) {
    suggestions = [
      "Dark",
      "Mindhunter",
      "Ozark",
      "Narcos",
      "Peaky Blinders",
      "The Wire",
      "Black Mirror",
      "Severance",
      "Succession",
      "The Boys",
    ];
  }

  return {
    text: `Because you liked "${title}"`,
    suggestions,
  };
}

// ============================================================
// AI COMPARE
// Side-by-side breakdown of two titles.
// Usage: aiCompare("Inception", "Interstellar")
// ============================================================
export interface AICompareResult {
  title1: string;
  title2: string;
  categories: {
    label: string;
    score1: number; // 1–10
    score2: number; // 1–10
    note: string; // one short sentence
  }[];
  verdict: string; // one punchy sentence on which to watch first
  watchTitle1If: string;
  watchTitle2If: string;
}

export async function aiCompare(
  title1: string,
  title2: string,
): Promise<AICompareResult> {
  const messages: AIChatMessage[] = [
    {
      role: "system",
      content: `
You are a brutally honest movie/show analyst.
Compare two titles across key dimensions.
Return ONLY a JSON object. No markdown, no preamble, no trailing text.

Format:
{
  "title1": "first title",
  "title2": "second title",
  "categories": [
    {
      "label": "Pacing",
      "score1": 7,
      "score2": 9,
      "note": "Title2 moves faster but Title1 builds better tension"
    },
    {
      "label": "Story depth",
      "score1": 9,
      "score2": 8,
      "note": "Both are layered but Title1 has more complexity"
    },
    {
      "label": "Rewatchability",
      "score1": 8,
      "score2": 6,
      "note": "Title1 reveals more on rewatch"
    },
    {
      "label": "Emotional impact",
      "score1": 7,
      "score2": 9,
      "note": "Title2 hits harder emotionally"
    },
    {
      "label": "Visuals",
      "score1": 9,
      "score2": 9,
      "note": "Both are visually stunning in different ways"
    }
  ],
  "verdict": "One punchy sentence on which to watch first and why",
  "watchTitle1If": "Short phrase — type of viewer who will prefer title1",
  "watchTitle2If": "Short phrase — type of viewer who will prefer title2"
}

Scores are 1–10. Always return exactly 5 categories.
`,
    },
    {
      role: "user",
      content: `Compare "${title1}" vs "${title2}"`,
    },
  ];

  const response = await callAI(messages, 500);

  try {
    const match = response.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    return JSON.parse(response);
  } catch {
    return {
      title1,
      title2,
      categories: [
        {
          label: "Pacing",
          score1: 7,
          score2: 7,
          note: "Both have strong pacing",
        },
        {
          label: "Story depth",
          score1: 8,
          score2: 8,
          note: "Both are well-written",
        },
        {
          label: "Rewatchability",
          score1: 7,
          score2: 7,
          note: "Worth revisiting",
        },
        {
          label: "Emotional impact",
          score1: 7,
          score2: 7,
          note: "Both land emotionally",
        },
        {
          label: "Visuals",
          score1: 8,
          score2: 8,
          note: "Both are well produced",
        },
      ],
      verdict: `Both "${title1}" and "${title2}" are excellent — start with whichever genre you're in the mood for.`,
      watchTitle1If: "You want something more cerebral",
      watchTitle2If: "You want something more emotional",
    };
  }
}

// ============================================================
// AI AUTO TAG
// Auto-generates genre tags, mood tags, and content warnings
// for a title based on its synopsis. Saves admin manual work.
//
// Usage: aiAutoTag("Inception", "A thief who steals secrets...")
// ============================================================
export interface AIAutoTagResult {
  genres: string[]; // e.g. ["Sci-Fi", "Thriller", "Action"]
  moods: string[]; // e.g. ["mind-bending", "intense", "slow burn"]
  themes: string[]; // e.g. ["identity", "grief", "reality"]
  contentWarnings: string[]; // e.g. ["violence", "mild language"]
  ageRating: string; // e.g. "PG-13", "18+", "Family"
  targetAudience: string; // e.g. "Adults who enjoy psychological thrillers"
}

export async function aiAutoTag(
  title: string,
  synopsis: string,
): Promise<AIAutoTagResult> {
  const messages: AIChatMessage[] = [
    {
      role: "system",
      content: `
You are a content tagging system for a movie streaming platform.
Given a title and synopsis, generate accurate tags for categorisation.
Return ONLY a JSON object. No markdown, no preamble, no trailing text.

Format:
{
  "genres": ["Genre1", "Genre2", "Genre3"],
  "moods": ["mood1", "mood2", "mood3"],
  "themes": ["theme1", "theme2"],
  "contentWarnings": ["warning1", "warning2"],
  "ageRating": "PG-13",
  "targetAudience": "One sentence describing who this is for"
}

Rules:
- genres: 2–4 items, proper case (e.g. "Sci-Fi", "Drama")
- moods: 2–4 short lowercase descriptors (e.g. "slow burn", "edge of your seat", "feel-good")
- themes: 2–3 single words (e.g. "identity", "survival", "revenge")
- contentWarnings: only include if relevant, else empty array []
- ageRating: one of "G", "PG", "PG-13", "15+", "18+", "Family"
- targetAudience: one short sentence
`,
    },
    {
      role: "user",
      content: `Title: "${title}"\nSynopsis: ${synopsis}`,
    },
  ];

  const response = await callAI(messages, 350);

  try {
    const match = response.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    return JSON.parse(response);
  } catch {
    return {
      genres: ["Drama"],
      moods: ["engaging"],
      themes: ["identity"],
      contentWarnings: [],
      ageRating: "PG-13",
      targetAudience: `Fans of "${title}" and similar content.`,
    };
  }
}

// ============================================================
// AI SEARCH INTENT
// Understands vague, fuzzy, or descriptive search queries and
// maps them to real movie/show titles.
//
// Usage: aiSearchIntent("that movie where the guy forgets everything")
// → { titles: ["Memento", "50 First Dates"], intent: "memory loss thriller" }
// ============================================================
export interface AISearchIntentResult {
  titles: string[]; // matched titles, best match first
  intent: string; // what the AI understood the query to mean
  confidence: "high" | "medium" | "low";
}

export async function aiSearchIntent(
  query: string,
): Promise<AISearchIntentResult> {
  const messages: AIChatMessage[] = [
    {
      role: "system",
      content: `
You are a smart movie/show search engine that understands vague, descriptive, or fuzzy queries.

A user types something like:
- "that movie where the guy forgets everything"
- "anime with a guy who can only survive 100 days"
- "the show about a chemistry teacher who makes drugs"
- "scary movie in a hotel with a creepy kid"

Identify what they are looking for and return the most likely matching titles.

Return ONLY a JSON object. No markdown, no preamble.

Format:
{
  "titles": ["Best Match", "Second Match", "Third Match"],
  "intent": "short phrase summarising what the user is looking for",
  "confidence": "high" | "medium" | "low"
}

Rules:
- titles: 1–5 items, best match first
- intent: 3–6 words describing what was understood (e.g. "memory loss thriller", "drug lord drama")
- confidence: "high" if you are certain, "medium" if likely, "low" if guessing
- If nothing matches, return titles: [] and confidence: "low"
`,
    },
    {
      role: "user",
      content: query,
    },
  ];

  const response = await callAI(messages, 250);

  try {
    const match = response.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    return JSON.parse(response);
  } catch {
    return {
      titles: [],
      intent: query,
      confidence: "low",
    };
  }
}

// ============================================================
// AI ENDING EXPLAINED
// Clear, spoiler-full explanation of a confusing or ambiguous
// ending. Should be shown behind a spoiler toggle in the UI.
//
// Usage: aiEndingExplained("Inception")
// ============================================================
export interface AIEndingExplainedResult {
  title: string;
  shortAnswer: string; // one punchy sentence — the TL;DR
  fullExplanation: string; // 2–4 paragraphs covering what happened and why
  theories: string[]; // 2–3 popular fan theories or interpretations
  directorIntent: string; // what the creator intended (if known)
  spoilerLevel: "full"; // always full — UI must gate this behind a toggle
}

export async function aiEndingExplained(
  title: string,
): Promise<AIEndingExplainedResult> {
  const messages: AIChatMessage[] = [
    {
      role: "system",
      content: `
You are a film analyst who explains movie and TV endings clearly and confidently.
This response is shown ONLY after the user clicks a spoiler warning — go full detail.

Return ONLY a JSON object. No markdown, no preamble, no trailing text.

Format:
{
  "title": "movie or show title",
  "shortAnswer": "One punchy TL;DR sentence answering 'what happened at the end'",
  "fullExplanation": "2 to 4 paragraphs. Explain what literally happened, then what it means thematically. Be clear and confident. No hedging.",
  "theories": [
    "Theory or interpretation 1",
    "Theory or interpretation 2",
    "Theory or interpretation 3"
  ],
  "directorIntent": "What the director or creator has said about the ending, or the most widely accepted interpretation if no official statement exists.",
  "spoilerLevel": "full"
}

Rules:
- shortAnswer: max 20 words, punchy
- fullExplanation: plain prose, 2–4 paragraphs separated by \\n\\n
- theories: exactly 2–3 items, each one sentence
- directorIntent: one short paragraph
`,
    },
    {
      role: "user",
      content: `Explain the ending of "${title}"`,
    },
  ];

  const response = await callAI(messages, 600);

  try {
    const match = response.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    return JSON.parse(response);
  } catch {
    return {
      title,
      shortAnswer: `The ending of "${title}" is intentionally ambiguous, leaving interpretation to the viewer.`,
      fullExplanation: `The final moments of "${title}" deliberately resist a single reading.\n\nThe creator designed the ending to provoke discussion rather than provide closure — what you take from it depends heavily on how you read the events leading up to it.`,
      theories: [
        "The protagonist achieved their goal but at great personal cost.",
        "The entire final act was a subjective experience, not literal.",
        "The ending mirrors the opening, suggesting a cyclical or unresolved story.",
      ],
      directorIntent:
        "No official statement has been made, leaving the ending open to interpretation.",
      spoilerLevel: "full",
    };
  }
}
