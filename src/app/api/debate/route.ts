import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { BOTS, BotId } from "@/lib/types";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { botId, topic, history } = await req.json() as {
      botId: BotId;
      topic: string;
      history: Array<{ role: "user" | "assistant"; content: string }>;
    };

    const bot = BOTS[botId];
    if (!bot) return NextResponse.json({ error: "Unknown bot" }, { status: 400 });

    const systemPrompt = `${bot.systemPrompt}

Тема дебатов: "${topic}"
Твоя позиция: ${botId === "alpha" ? "За (поддерживаешь утреннюю пробежку / первый вариант)" : "Против (поддерживаешь вечернюю пробежку / второй вариант)"}

Правила:
- Отвечай ТОЛЬКО на русском языке
- 2-4 предложения максимум
- Не повторяй аргументы, которые уже использовал
- Будь конкретным и убедительным`;

    const messages = history.length > 0 ? history : [
      { role: "user" as const, content: `Начни дебаты по теме: "${topic}". Выскажи свою начальную позицию.` }
    ];

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 300,
      system: systemPrompt,
      messages,
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const wordCount = text.split(/\s+/).filter(Boolean).length;

    // Simple agreement detection
    const agreementWords = ["согласен", "согласна", "верно", "правильно", "действительно", "точно", "да,"];
    const agreementScore = agreementWords.some(w => text.toLowerCase().includes(w)) ? 0.8 : 0.1;

    return NextResponse.json({ text, wordCount, agreementScore });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "API error" }, { status: 500 });
  }
}
