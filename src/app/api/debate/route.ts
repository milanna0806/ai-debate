import { NextRequest, NextResponse } from "next/server";
import { BOTS } from "@/lib/types";
import { generateReply, ChatMessage } from "@/lib/ai-providers";

export async function POST(req: NextRequest) {
  try {
    const { botId, topic, history, position } = await req.json() as {
      botId: string; topic: string;
      history: ChatMessage[]; position?: string;
    };

    const bot = BOTS[botId];
    if (!bot) return NextResponse.json({ error: `Неизвестный бот: ${botId}` }, { status: 400 });

    const positionText = position === "against"
      ? "Против (критикуешь и опровергаешь)"
      : "За (защищаешь и поддерживаешь)";

    const systemPrompt = `${bot.systemPrompt}

Тема дебатов: "${topic}"
Твоя позиция: ${positionText}

Правила:
- Отвечай ТОЛЬКО на русском языке
- 2-4 предложения максимум
- Не повторяй аргументы
- Будь конкретным и убедительным`;

    const messages: ChatMessage[] = history?.length > 0
      ? history
      : [{ role: "user", content: `Начни дебаты: "${topic}". Выскажи позицию кратко.` }];

    const text = await generateReply(bot.model, systemPrompt, messages, 300);
    if (!text) return NextResponse.json({ error: "Пустой ответ от модели" }, { status: 500 });

    const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
    const agreementWords = ["согласен", "согласна", "верно", "правильно", "действительно", "точно"];
    const agreementScore = agreementWords.some(w => text.toLowerCase().includes(w)) ? 0.8 : 0.1;

    return NextResponse.json({ text, wordCount, agreementScore });
  } catch (err: any) {
    console.error("Debate error:", err);
    return NextResponse.json({ error: err?.message ?? "API error" }, { status: 500 });
  }
}
