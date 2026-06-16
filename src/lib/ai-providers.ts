import OpenAI from "openai";

export type ChatMessage = { role: "user" | "assistant"; content: string };

// Both ALPHA and BETA talk through OpenRouter — one account, one key,
// free models, no credit card and no Google Cloud service-account
// nonsense. OpenRouter speaks the same API shape as OpenAI, just with
// a different base URL.
let client: OpenAI | null = null;
function getClient() {
  if (!client) {
    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error("OPENROUTER_API_KEY is not set");
    }
    client = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: "https://openrouter.ai/api/v1",
    });
  }
  return client;
}

export async function generateReply(
  model: string,
  systemPrompt: string,
  history: ChatMessage[],
  maxTokens = 300
): Promise<string> {
  const completion = await getClient().chat.completions.create({
    model,
    max_tokens: maxTokens,
    messages: [
      { role: "system", content: systemPrompt },
      ...history.map((m) => ({ role: m.role, content: m.content })),
    ],
  });

  return completion.choices[0]?.message?.content?.trim() ?? "";
}
