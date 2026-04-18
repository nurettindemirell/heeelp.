import { runEnglishCheck } from "../../../lib/checkEnglish";

export async function POST(request) {
  try {
    const body = await request.json();

    const result = await runEnglishCheck({
      text: body.text,
    });

    return Response.json(result);
  } catch (error) {
    return Response.json(
      { error: error.message || "Cümle kontrolü sırasında hata oluştu." },
      { status: 500 }
    );
  }
}