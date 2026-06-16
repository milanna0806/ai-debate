import Anthropic from "@anthropic-ai/sdk";

export type ChatMessage = { role: "user" | "assistant"; content: string };

let client: Anthropic | null = null;

function getClient() {
  if (!client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not set");
    }
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

// Map OpenRouter model names → Anthropic model names
function resolveModel(model: string): string {
  // All bots use claude-haiku-4-5 — fast and cheap
  return "claude-haiku-4-5";
}

export async function generateReply(
  model: string,
  systemPrompt: string,
  history: ChatMessage[],
  maxTokens = 300
): Promise<string> {
  const resolvedModel = resolveModel(model);

  const response = await getClient().messages.create({
    model: resolvedModel,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: history.map((m) => ({ role: m.role, content: m.content })),
  });

  const block = response.content[0];
  return block?.type === "text" ? block.text.trim() : "";
}
