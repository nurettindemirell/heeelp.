import { openai } from "./openai";


function simplifyForComparison(text) {
  return (text || "")
    .toLowerCase()
    .replace(/[.,!?;:'"]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function differsOnlyByPunctuationOrCase(original, corrected) {
  return simplifyForComparison(original) === simplifyForComparison(corrected);
}

export async function runEnglishCheck({ text }) {
  const cleanText = text?.trim();

  if (!cleanText) {
    throw new Error("Metin gerekli.");
  }

  const response = await openai.responses.create({
    model: process.env.OPENAI_MODEL || "gpt-5.4-nano",
    model: process.env.OPENAI_MODEL_CHECK || "gpt-5.4-nano",
    instructions: [
      "You are an English sentence checker.",
      "Ignore punctuation mistakes completely.",
      "Ignore capitalization mistakes completely.",
      "Treat missing apostrophes in contractions as non-errors.",
      "Do not mark a sentence incorrect because of missing apostrophes, commas, periods, question marks, or lowercase writing.",
      "Be strict only about grammar, tense, articles, prepositions, word order, collocations, clause structure, and unnatural phrasing.",
      "Evaluate the sentence at B2-C1 level.",
      "Output only the required JSON."
    ].join(" "),
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: cleanText,
          },
        ],
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "english_check_result",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            verdict: {
              type: "string",
              enum: ["correct", "incorrect"]
            },
            corrected: {
              type: "string"
            },
            alternative: {
              type: "string"
            }
          },
          required: ["verdict", "corrected", "alternative"]
        }
      }
    },
    max_output_tokens: 120,
  });

  const raw = response.output_text || "{}";
  let parsed;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Kontrol sonucu parse edilemedi.");
  }

  const corrected = (parsed.corrected || "").trim();
  const alternative = (parsed.alternative || "").trim();

  if (differsOnlyByPunctuationOrCase(cleanText, corrected)) {
    return {
      text: `Correct.\nAlternative: ${alternative || corrected}`,
      responseId: response.id,
    };
  }

  if (parsed.verdict === "correct") {
    return {
      text: `Correct.\nAlternative: ${alternative}`,
      responseId: response.id,
    };
  }

  return {
    text: `Incorrect.\nCorrected: ${corrected}\nAlternative: ${alternative}`,
    responseId: response.id,
  };
}