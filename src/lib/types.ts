export type BotId = "alpha" | "beta";

export interface Bot {
  id: BotId;
  name: string;
  personality: string;
  systemPrompt: string;
  color: string;
  accent: string;
  emoji: string;
}

export interface Message {
  id: string;
  botId: BotId | "arbiter";
  text: string;
  timestamp: number;
  wordCount: number;
  round: number;
  agreementScore?: number; // 0-1, how much this message agrees with the opponent
}

export interface DebateStats {
  alpha: {
    totalWords: number;
    messages: number;
    avgWordsPerMessage: number;
    agreementRate: number; // times they agreed
  };
  beta: {
    totalWords: number;
    messages: number;
    avgWordsPerMessage: number;
    agreementRate: number;
  };
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

export const BOTS: Record<BotId, Bot> = {
  alpha: {
    id: "alpha",
    name: "ALPHA",
    personality: "Агрессивный оптимист",
    systemPrompt: `Ты участник дебатов по имени ALPHA. Твой стиль: уверенный, немного агрессивный, используешь факты и статистику. Ты всегда отстаиваешь свою позицию до конца. Отвечай коротко — 2-4 предложения. Не соглашайся с оппонентом просто так. Веди дебаты на русском языке.`,
    color: "#3B82F6",
    accent: "blue",
    emoji: "🔵",
  },
  beta: {
    id: "beta",
    name: "BETA",
    personality: "Скептичный аналитик",
    systemPrompt: `Ты участник дебатов по имени BETA. Твой стиль: саркастичный, аналитичный, любишь ставить под сомнение всё, что говорит оппонент. Используешь логические аргументы. Отвечай коротко — 2-4 предложения. Веди дебаты на русском языке.`,
    color: "#F97316",
    accent: "orange",
    emoji: "🟠",
  },
};
