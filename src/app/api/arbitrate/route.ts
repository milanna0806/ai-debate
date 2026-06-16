import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { topic, transcript, stats } = await req.json();

    const prompt = `Ты — беспристрастный арбитр дебатов. Проанализируй следующие дебаты и вынеси вердикт.

Тема дебатов: "${topic}"

Участники:
- ALPHA 🔵 (Агрессивный оптимист)
- BETA 🟠 (Скептичный аналитик)

Статистика:
- ALPHA: ${stats.alpha.totalWords} слов, ${stats.alpha.messages} реплик
- BETA: ${stats.beta.totalWords} слов, ${stats.beta.messages} реплик

Транскрипт дебатов:
${transcript}

Ответь СТРОГО в формате JSON (без markdown, только JSON):
{
  "winner": "ALPHA" | "BETA" | "НИЧЬЯ",
  "verdict": "Краткий вердикт (2-3 предложения на русском)",
  "alphaStrengths": "Сильные стороны ALPHA (1 предложение)",
  "betaStrengths": "Сильные стороны BETA (1 предложение)",
  "alphaScore": число от 0 до 100,
  "betaScore": число от 0 до 100,
  "mostPersuasiveArg": "Самый убедительный аргумент в дебатах"
}`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 600,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text : "{}";
    
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Try to extract JSON from the response
      const match = raw.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : { winner: "НИЧЬЯ", verdict: raw };
    }

    return NextResponse.json(parsed);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Arbiter error" }, { status: 500 });
  }
}
