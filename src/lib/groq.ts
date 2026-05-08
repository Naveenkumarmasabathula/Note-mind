import type { Difficulty } from "@/lib/types";

export type GroqNoteResult = {
  title: string;
  subject: string;
  difficulty: Difficulty;
  summary: string;
  key_points: string[];
  diagram_needed: boolean;
  diagram_description: string | null;
  revision_questions: string[];
  tags: string[];
};

const SYSTEM_PROMPT = `You are a precise note-taking assistant. When given a ChatGPT conversation, produce structured study notes in the following JSON format:

{
  "title": "short descriptive title of the topic",
  "subject": "detected subject (e.g. Mathematics, Biology, Programming, History, Physics, General)",
  "difficulty": "easy | medium | hard",
  "summary": "2-4 clear sentences explaining the core concept. Be precise, not vague.",
  "key_points": ["point 1", "point 2", "point 3"],
  "diagram_needed": true or false,
  "diagram_description": "if difficulty is medium or hard, describe in Mermaid.js syntax a simple diagram. Otherwise null.",
  "revision_questions": ["question 1?", "question 2?", "question 3?"],
  "tags": ["tag1", "tag2"]
}

Rules:
- summary must be precise and self-contained
- key_points should be bullet-ready facts
- set diagram_needed to true only for medium or hard topics with a visual structure
- revision_questions should test genuine understanding
- detect the subject automatically from context
- for diagram_description, output valid Mermaid.js syntax (flowchart or mindmap)
- respond ONLY with valid JSON, no markdown fences`;

export async function summarizeConversation(
  messages: Array<{ role: string; text: string }>,
) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("Missing GROQ_API_KEY.");

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: messages
            .map((message) => `${message.role}: ${message.text}`)
            .join("\n\n"),
        },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Groq request failed: ${detail}`);
  }

  const payload = await response.json();
  return JSON.parse(payload.choices?.[0]?.message?.content ?? "{}") as GroqNoteResult;
}
