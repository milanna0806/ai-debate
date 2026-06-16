import { NextRequest, NextResponse } from "next/server";
import { BOTS } from "@/lib/types";
import { generateReply, ChatMessage } from "@/lib/ai-providers";

export async function POST(req: NextRequest) {
  // Проверяем API ключ сразу
  if (!process.env.OPENROUTER_API_KEY) {
    console.error("OPENROUTER_API_KEY is not set!");
    return NextResponse.json(
      { error: "Сервер не настроен: отсутствует OPENROUTER_API_KEY. Добавьте его в Vercel Environment Variables." },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();
    const { botId, topic, history, position } = body as {
      botId: string;
      topic: string;
      history: ChatMessage[];
      position?: string;
    };

    console.log(`[Debate] botId=${botId}, topic="${topic}", historyLen=${history?.length ?? 0}`);

    const bot = BOTS[botId];
    if (!bot) {
      return NextResponse.json({ error: `Неизвестный бот: ${botId}` }, { status: 400 });
    }

    const positionText =
      position === "against"
        ? "Против (ты критикуешь и опровергаешь тезис)"
        : "За (ты защищаешь и поддерживаешь тезис)";

    const systemPrompt = `${bot.systemPrompt}

Тема дебатов: "${topic}"
Твоя позиция: ${positionText}

Правила:
- Отвечай ТОЛЬКО на русском языке
- 2-4 предложения максимум
- Не повторяй аргументы, которые уже использовал
- Будь конкретным и убедительным
- Всегда отвечай на последний аргумент оппонента`;

    const messages: ChatMessage[] =
      history && history.length > 0
        ? history
        : [
            {
              role: "user",
              content: `Начни дебаты по теме: "${topic}". Выскажи свою начальную позицию кратко.`,
            },
          ];

    const text = await generateReply(bot.model, systemPrompt, messages, 300);

    if (!text) {
      return NextResponse.json({ error: "Модель вернула пустой ответ" }, { status: 500 });
    }

    const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
    const agreementWords = ["согласен", "согласна", "верно", "правильно", "действительно", "точно", "да,"];
    const agreementScore = agreementWords.some((w) => text.toLowerCase().includes(w)) ? 0.8 : 0.1;

    console.log(`[Debate] ${botId} replied: ${wordCount} words`);

    return NextResponse.json({ text, wordCount, agreementScore });
  } catch (err: any) {
    console.error("Debate API error:", err?.message, err?.status, err?.response?.data);
    const message =
      err?.message?.includes("API key")
        ? "Неверный OPENROUTER_API_KEY — проверьте ключ в настройках Vercel"
        : err?.message?.includes("model")
        ? "Модель недоступна — возможно, бесплатный лимит исчерпан"
        : err?.message ?? "API error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
