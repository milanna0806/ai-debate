import { NextRequest, NextResponse } from "next/server";
import { BOTS, BotId } from "@/lib/types";
import { generateReply, ChatMessage } from "@/lib/ai-providers";

export async function POST(req: NextRequest) {
  try {
    const { botId, topic, history } = (await req.json()) as {
      botId: BotId;
      topic: string;
      history: ChatMessage[];
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

    const messages: ChatMessage[] =
      history.length > 0
        ? history
        : [
            {
              role: "user",
              content: `Начни дебаты по теме: "${topic}". Выскажи свою начальную позицию.`,
            },
          ];

    const text = await generateReply(bot.model, systemPrompt, messages, 300);

    const wordCount = text.split(/\s+/).filter(Boolean).length;

    // Simple agreement detection
    const agreementWords = ["согласен", "согласна", "верно", "правильно", "действительно", "точно", "да,"];
    const agreementScore = agreementWords.some((w) => text.toLowerCase().includes(w)) ? 0.8 : 0.1;

    return NextResponse.json({ text, wordCount, agreementScore });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "API error" }, { status: 500 });
  }
}
