import { runTranslation } from "../../../../lib/translate";

export async function POST(request) {
  try {
    const body = await request.json();

    const result = await runTranslation({
      direction: "en-tr",
      text: body.text,
      previousResponseId: body.previousResponseId,
      continueContext: body.continueContext,
    });

    return Response.json(result);
  } catch (error) {
    return Response.json(
      { error: error.message || "Çeviri sırasında hata oluştu." },
      { status: 500 }
    );
  }
}