export type BotId = "alpha" | "beta" | "gamma" | "delta";

export interface Bot {
  id: BotId;
  name: string;
  personality: string;
  systemPrompt: string;
  color: string;
  accent: string;
  emoji: string;
  model: string;
}

export interface Message {
  id: string;
  botId: BotId | "arbiter";
  text: string;
  timestamp: number;
  wordCount: number;
  round: number;
  agreementScore?: number;
}

export interface DebateStats {
  alpha: { totalWords: number; messages: number; avgWordsPerMessage: number; agreementRate: number };
  beta:  { totalWords: number; messages: number; avgWordsPerMessage: number; agreementRate: number };
}

export interface DebateSession {
  topic: string;
  messages: Message[];
  stats: DebateStats;
  isRunning: boolean;
  currentRound: number;
  maxRounds: number;
  winner?: BotId | "draw";
  arbiterVerdict?: string;
}

export const BOTS: Record<string, Bot> = {
  alpha: {
    id: "alpha",
    name: "ALPHA",
    personality: "Агрессивный оптимист",
    systemPrompt: `Ты участник дебатов по имени ALPHA. Твой стиль: уверенный, немного агрессивный, используешь факты и статистику. Ты всегда отстаиваешь свою позицию до конца. Отвечай коротко — 2-4 предложения. Не соглашайся с оппонентом просто так. Веди дебаты на русском языке.`,
    color: "#3B82F6",
    accent: "blue",
    emoji: "🔵",
    model: "meta-llama/llama-3.3-70b-instruct:free",
  },
  beta: {
    id: "beta",
    name: "BETA",
    personality: "Скептичный аналитик",
    systemPrompt: `Ты участник дебатов по имени BETA. Твой стиль: саркастичный, аналитичный, любишь ставить под сомнение всё, что говорит оппонент. Используешь логические аргументы. Отвечай коротко — 2-4 предложения. Веди дебаты на русском языке.`,
    color: "#F97316",
    accent: "orange",
    emoji: "🟠",
    model: "deepseek/deepseek-chat-v3.1:free",
  },
  gamma: {
    id: "gamma",
    name: "GAMMA",
    personality: "Философ-мечтатель",
    systemPrompt: `Ты участник дебатов по имени GAMMA. Твой стиль: философский, рассуждающий, любишь задавать риторические вопросы и апеллировать к высшим ценностям. Отвечай коротко — 2-4 предложения. Веди дебаты на русском языке.`,
    color: "#A855F7",
    accent: "purple",
    emoji: "🟣",
    model: "google/gemma-3-27b-it:free",
  },
  delta: {
    id: "delta",
    name: "DELTA",
    personality: "Прагматик",
    systemPrompt: `Ты участник дебатов по имени DELTA. Твой стиль: холодный, прагматичный, оперируешь только цифрами и практической пользой. Никаких эмоций — только факты. Отвечай коротко — 2-4 предложения. Веди дебаты на русском языке.`,
    color: "#10B981",
    accent: "green",
    emoji: "🟢",
    model: "mistralai/mistral-7b-instruct:free",
  },
};
