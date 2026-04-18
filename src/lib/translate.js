import { openai } from "./openai";

function buildPrompt(direction, text) {
  if (direction === "en-tr") {
    return [
      "You are a high-quality translation assistant.",
      "Translate the user's text from English to Turkish.",
      "Do not translate word-for-word unless that sounds natural.",
      "Prefer the most natural Turkish phrasing.",
      "Preserve meaning, tone, emotional nuance, and intent.",
      "If the sentence is ambiguous, choose the most natural interpretation.",
      "Keep names unchanged.",
      "Return the result only in the required JSON schema.",
      "",
      "Examples:",
      "English: I didn't mean it like that.",
      "Turkish: Bunu o şekilde demek istemedim.",
      "",
      "English: He is seeing someone.",
      "Turkish: Biriyle görüşüyor.",
      "",
      "English: Give me a break.",
      "Turkish: Hadi ama.",
      "",
      "English: You shouldn't go.",
      "Turkish: Gitmemelisin.",
      "",
      "Text:",
      text,
    ].join("\n");
  }

  return [
    "You are a high-quality translation assistant.",
    "Translate the user's text from Turkish to English.",
    "Do not translate word-for-word unless that sounds natural.",
    "Prefer the most natural English phrasing.",
    "Preserve meaning, tone, emotional nuance, and intent.",
    "If the sentence is ambiguous, choose the most natural interpretation.",
    "Keep names unchanged.",
    "Return the result only in the required JSON schema.",
    "",
    "Examples:",
    "Turkish: Bunu o şekilde demek istemedim.",
    "English: I didn't mean it like that.",
    "",
    "Turkish: Biriyle görüşüyor.",
    "English: He is seeing someone.",
    "",
    "Turkish: Hadi ama.",
    "English: Give me a break.",
    "",
    "Turkish: Gitmemelisin.",
    "English: You shouldn't go.",
    "",
    "Text:",
    text,
  ].join("\n");
}

function normalize(value) {
  return (value || "").replace(/\s+/g, " ").trim().toLowerCase();
}

function cleanAlternatives(main, alternatives) {
  const seen = new Set([normalize(main)]);
  const result = [];

  for (const item of alternatives || []) {
    const text = (item || "").trim();
    const key = normalize(text);

    if (!text) continue;
    if (seen.has(key)) continue;

    seen.add(key);
    result.push(text);

    if (result.length === 2) break;
  }

  return result;
}

export async function runTranslation({
  direction,
  text,
  previousResponseId,
  continueContext = false,
}) {
  const cleanText = text?.trim();

  if (!cleanText) {
    throw new Error("Metin gerekli.");
  }

  const response = await openai.responses.create({
    model: process.env.OPENAI_MODEL_TRANSLATE || "gpt-5.4-mini",
    input: buildPrompt(direction, cleanText),
    text: {
      format: {
        type: "json_schema",
        name: "translation_result",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            main: {
              type: "string",
            },
            alternatives: {
              type: "array",
              items: {
                type: "string",
              },
              minItems: 0,
              maxItems: 2,
            },
          },
          required: ["main", "alternatives"],
        },
      },
    },
    max_output_tokens: 220,
    previous_response_id:
      continueContext && previousResponseId ? previousResponseId : undefined,
    store: continueContext,
  });

  const raw = response.output_text || "{}";
  let parsed;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Çeviri parse edilemedi.");
  }

  const main = (parsed.main || "").trim();

  if (!main) {
    throw new Error("Çeviri üretilemedi.");
  }

  if (normalize(main) === normalize(cleanText)) {
    throw new Error("Model çeviri yerine aynı metni geri verdi.");
  }

  const alternatives = cleanAlternatives(main, parsed.alternatives);

let finalText = `${main}`;

if (alternatives[0]) {
  finalText += `\nAlternative 1: ${alternatives[0]}`;
}

if (alternatives[1]) {
  finalText += `\nAlternative 2: ${alternatives[1]}`;
}

  return {
    text: finalText,
    responseId: response.id,
  };
}