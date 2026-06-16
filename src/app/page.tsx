"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Message, DebateStats, BotId, BOTS } from "@/lib/types";

const TOPICS = [
  "Что лучше: утренняя или вечерняя пробежка?",
  "Кофе vs Чай: что полезнее?",
  "Удалённая работа лучше офисной?",
  "Искусственный интеллект угрожает человечеству?",
  "Лучше читать книги или смотреть фильмы?",
  "Жить в городе или на природе?",
];

const DEFAULT_ROUNDS = 4;

function TypingIndicator({ color }: { color: string }) {
  return (
    <div className="flex items-center gap-1.5 px-4 py-3">
      <span className="text-xs font-medium" style={{ color }}>думает</span>
      {[0, 1, 2].map(i => (
        <span key={i} className="typing-dot w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color, animationDelay: `${i * 0.2}s` }} />
      ))}
    </div>
  );
}

function MessageBubble({ msg }: { msg: Message }) {
  const isAlpha = msg.botId === "alpha";
  const isArbiter = msg.botId === "arbiter";
  const bot = isArbiter ? null : BOTS[msg.botId as BotId];

  if (isArbiter) {
    return (
      <div className="animate-slide-in-center flex justify-center my-4">
        <div className="max-w-lg w-full rounded-2xl border border-[#A78BFA]/30 bg-[#1A1A2E] p-4 glow-purple">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-purple-400 text-xs font-display font-semibold uppercase tracking-widest">⚖️ Арбитр</span>
          </div>
          <p className="text-slate-300 text-sm leading-relaxed">{msg.text}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`animate-${isAlpha ? "slide-in-left" : "slide-in-right"} flex ${isAlpha ? "justify-start" : "justify-end"} mb-3`}>
      <div className="max-w-[72%]">
        <div className={`flex items-center gap-2 mb-1 ${isAlpha ? "" : "justify-end"}`}>
          <span className="text-xs font-display font-semibold uppercase tracking-wider" style={{ color: bot?.color }}>
            {bot?.emoji} {bot?.name}
          </span>
          <span className="text-xs text-slate-600">R{msg.round}</span>
        </div>
        <div
          className="rounded-2xl px-4 py-3 text-sm leading-relaxed"
          style={{
            background: isAlpha
              ? "linear-gradient(135deg, rgba(59,130,246,0.15), rgba(59,130,246,0.05))"
              : "linear-gradient(135deg, rgba(249,115,22,0.15), rgba(249,115,22,0.05))",
            border: `1px solid ${bot?.color}30`,
          }}
        >
          {msg.text}
        </div>
        <div className={`flex ${isAlpha ? "" : "justify-end"} mt-1`}>
          <span className="text-xs text-slate-600">{msg.wordCount} слов</span>
        </div>
      </div>
    </div>
  );
}

function StatBar({ label, alphaVal, betaVal, isPercent }: { label: string; alphaVal: number; betaVal: number; isPercent?: boolean }) {
  const total = alphaVal + betaVal || 1;
  const alphaW = (alphaVal / total) * 100;
  return (
    <div className="mb-4">
      <div className="flex justify-between text-xs text-slate-400 mb-1.5">
        <span className="text-blue-400 font-semibold">{isPercent ? `${alphaVal}%` : alphaVal}</span>
        <span className="text-slate-500">{label}</span>
        <span className="text-orange-400 font-semibold">{isPercent ? `${betaVal}%` : betaVal}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-800 overflow-hidden flex">
        <div className="h-full rounded-l-full transition-all duration-700" style={{ width: `${alphaW}%`, background: "#3B82F6" }} />
        <div className="h-full rounded-r-full transition-all duration-700" style={{ width: `${100 - alphaW}%`, background: "#F97316" }} />
      </div>
    </div>
  );
}

interface ArbiterResult {
  winner?: string;
  verdict?: string;
  alphaStrengths?: string;
  betaStrengths?: string;
  alphaScore?: number;
  betaScore?: number;
  mostPersuasiveArg?: string;
}

export default function DebateArena() {
  const [topic, setTopic] = useState(TOPICS[0]);
  const [customTopic, setCustomTopic] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [stats, setStats] = useState<DebateStats>({
    alpha: { totalWords: 0, messages: 0, avgWordsPerMessage: 0, agreementRate: 0 },
    beta: { totalWords: 0, messages: 0, avgWordsPerMessage: 0, agreementRate: 0 },
  });
  const [isRunning, setIsRunning] = useState(false);
  const [currentRound, setCurrentRound] = useState(0);
  const [maxRounds] = useState(DEFAULT_ROUNDS);
  const [typingBot, setTypingBot] = useState<BotId | null>(null);
  const [arbiterResult, setArbiterResult] = useState<ArbiterResult | null>(null);
  const [isArbitraging, setIsArbitraging] = useState(false);
  const [phase, setPhase] = useState<"setup" | "debate" | "verdict">("setup");
  const [history, setHistory] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const debateRef = useRef(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingBot]);

  const effectiveTopic = customTopic.trim() || topic;

  const fetchBotTurn = useCallback(async (
    botId: BotId,
    round: number,
    currentHistory: Array<{ role: "user" | "assistant"; content: string }>
  ) => {
    setTypingBot(botId);
    const res = await fetch("/api/debate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ botId, topic: effectiveTopic, history: currentHistory }),
    });
    const data = await res.json();
    setTypingBot(null);
    return data as { text: string; wordCount: number; agreementScore: number };
  }, [effectiveTopic]);

  const runDebate = useCallback(async () => {
    if (debateRef.current) return;
    debateRef.current = true;
    setPhase("debate");
    setIsRunning(true);
    setMessages([]);
    setArbiterResult(null);
    setCurrentRound(0);

    let localHistory: Array<{ role: "user" | "assistant"; content: string }> = [];
    let localStats = {
      alpha: { totalWords: 0, messages: 0, avgWordsPerMessage: 0, agreementRate: 0 },
      beta: { totalWords: 0, messages: 0, avgWordsPerMessage: 0, agreementRate: 0 },
    };
    const allMessages: Message[] = [];

    for (let round = 1; round <= maxRounds; round++) {
      if (!debateRef.current) break;
      setCurrentRound(round);

      // ALPHA speaks
      const alphaRes = await fetchBotTurn("alpha", round, localHistory);
      const alphaMsg: Message = {
        id: `alpha-${round}`,
        botId: "alpha",
        text: alphaRes.text,
        timestamp: Date.now(),
        wordCount: alphaRes.wordCount,
        round,
        agreementScore: alphaRes.agreementScore,
      };
      allMessages.push(alphaMsg);
      setMessages([...allMessages]);
      localHistory = [
        ...localHistory,
        ...(localHistory.length === 0
          ? [{ role: "user" as const, content: `Начни дебаты по теме: "${effectiveTopic}". Выскажи свою начальную позицию.` }]
          : [{ role: "user" as const, content: `Ответь на аргумент оппонента: "${alphaRes.text}"` }]),
        { role: "assistant" as const, content: alphaRes.text },
      ];
      localStats.alpha.totalWords += alphaRes.wordCount;
      localStats.alpha.messages += 1;
      localStats.alpha.avgWordsPerMessage = Math.round(localStats.alpha.totalWords / localStats.alpha.messages);
      if (alphaRes.agreementScore > 0.5) localStats.alpha.agreementRate++;

      setStats({ ...localStats });
      await new Promise(r => setTimeout(r, 800));

      if (!debateRef.current) break;

      // BETA speaks
      const betaHistory: Array<{ role: "user" | "assistant"; content: string }> = [
        { role: "user" as const, content: `Ответь на аргумент оппонента: "${alphaRes.text}"` }
      ];
      const betaRes = await fetchBotTurn("beta", round, betaHistory);
      const betaMsg: Message = {
        id: `beta-${round}`,
        botId: "beta",
        text: betaRes.text,
        timestamp: Date.now(),
        wordCount: betaRes.wordCount,
        round,
        agreementScore: betaRes.agreementScore,
      };
      allMessages.push(betaMsg);
      setMessages([...allMessages]);
      localHistory = [
        ...localHistory,
        { role: "user" as const, content: `Оппонент ответил: "${betaRes.text}". Продолжи дебаты.` },
      ];
      localStats.beta.totalWords += betaRes.wordCount;
      localStats.beta.messages += 1;
      localStats.beta.avgWordsPerMessage = Math.round(localStats.beta.totalWords / localStats.beta.messages);
      if (betaRes.agreementScore > 0.5) localStats.beta.agreementRate++;

      setStats({ ...localStats });
      await new Promise(r => setTimeout(r, 800));
    }

    // Request arbiter
    if (debateRef.current) {
      setIsArbitraging(true);
      setIsRunning(false);

      const transcript = allMessages
        .map(m => `${BOTS[m.botId as BotId]?.name || "?"} (Раунд ${m.round}): ${m.text}`)
        .join("\n\n");

      const arbRes = await fetch("/api/arbitrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: effectiveTopic, transcript, stats: localStats }),
      });
      const arbData: ArbiterResult = await arbRes.json();
      setArbiterResult(arbData);
      setIsArbitraging(false);
      setPhase("verdict");
    }

    debateRef.current = false;
    setHistory(localHistory);
  }, [effectiveTopic, maxRounds, fetchBotTurn]);

  const stopDebate = () => {
    debateRef.current = false;
    setIsRunning(false);
    setTypingBot(null);
  };

  const resetDebate = () => {
    debateRef.current = false;
    setIsRunning(false);
    setTypingBot(null);
    setMessages([]);
    setArbiterResult(null);
    setCurrentRound(0);
    setPhase("setup");
    setHistory([]);
    setStats({
      alpha: { totalWords: 0, messages: 0, avgWordsPerMessage: 0, agreementRate: 0 },
      beta: { totalWords: 0, messages: 0, avgWordsPerMessage: 0, agreementRate: 0 },
    });
  };

  const winnerColor = arbiterResult?.winner === "ALPHA" ? "#3B82F6" : arbiterResult?.winner === "BETA" ? "#F97316" : "#A78BFA";

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0D0D14" }}>
      {/* Header */}
      <header className="border-b border-[#2A2A3A] px-6 py-4 flex items-center justify-between sticky top-0 z-20" style={{ background: "#0D0D14" }}>
        <div className="flex items-center gap-3">
          <span className="text-2xl">⚔️</span>
          <div>
            <h1 className="font-display font-bold text-white text-lg leading-none">AI DEBATE ARENA</h1>
            <p className="text-xs text-slate-500 mt-0.5">Два ИИ. Одна тема. Кто убедительнее?</p>
          </div>
        </div>
        {phase !== "setup" && (
          <button
            onClick={resetDebate}
            className="text-xs text-slate-400 hover:text-white border border-[#2A2A3A] hover:border-slate-500 rounded-lg px-3 py-1.5 transition-colors"
          >
            ↩ Сначала
          </button>
        )}
      </header>

      {/* Bot header strip */}
      <div className="border-b border-[#2A2A3A] flex" style={{ background: "#16161F" }}>
        {/* Alpha */}
        <div className="flex-1 px-4 py-3 flex items-center gap-3 border-r border-[#2A2A3A]">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl font-bold glow-blue"
            style={{ background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.4)" }}>A</div>
          <div>
            <div className="font-display font-bold text-blue-400 text-sm">ALPHA</div>
            <div className="text-xs text-slate-500">Агрессивный оптимист</div>
          </div>
          {phase !== "setup" && (
            <div className="ml-auto text-right">
              <div className="text-blue-400 font-display font-bold">{stats.alpha.totalWords}</div>
              <div className="text-xs text-slate-600">слов</div>
            </div>
          )}
        </div>

        {/* VS */}
        <div className="flex items-center px-4">
          <div className="vs-badge font-display font-bold text-xs text-slate-500 tracking-widest">VS</div>
        </div>

        {/* Beta */}
        <div className="flex-1 px-4 py-3 flex items-center justify-end gap-3 border-l border-[#2A2A3A]">
          {phase !== "setup" && (
            <div className="text-left">
              <div className="text-orange-400 font-display font-bold">{stats.beta.totalWords}</div>
              <div className="text-xs text-slate-600">слов</div>
            </div>
          )}
          <div className="text-right">
            <div className="font-display font-bold text-orange-400 text-sm">BETA</div>
            <div className="text-xs text-slate-500">Скептичный аналитик</div>
          </div>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl font-bold glow-orange"
            style={{ background: "rgba(249,115,22,0.15)", border: "1px solid rgba(249,115,22,0.4)" }}>B</div>
        </div>
      </div>

      {/* Setup phase */}
      {phase === "setup" && (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-xl w-full">
            <h2 className="font-display font-bold text-2xl text-white mb-2 text-center">Выбери тему дебатов</h2>
            <p className="text-slate-500 text-sm text-center mb-8">Два ИИ будут спорить {maxRounds} раундов, затем арбитр вынесет вердикт</p>

            <div className="grid gap-2 mb-6">
              {TOPICS.map((t) => (
                <button
                  key={t}
                  onClick={() => { setTopic(t); setCustomTopic(""); }}
                  className={`text-left px-4 py-3 rounded-xl text-sm transition-all border ${
                    topic === t && !customTopic
                      ? "border-blue-500/60 bg-blue-500/10 text-white"
                      : "border-[#2A2A3A] text-slate-400 hover:border-slate-600 hover:text-slate-300"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="mb-6">
              <input
                type="text"
                placeholder="Или введи свою тему..."
                value={customTopic}
                onChange={e => setCustomTopic(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#16161F] border border-[#2A2A3A] text-white placeholder-slate-600 text-sm focus:outline-none focus:border-blue-500/50 transition-colors"
              />
            </div>

            <button
              onClick={runDebate}
              className="w-full py-4 rounded-xl font-display font-bold text-white text-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: "linear-gradient(135deg, #3B82F6, #6366F1)" }}
            >
              ⚔️ Начать дебаты
            </button>
          </div>
        </div>
      )}

      {/* Debate phase */}
      {(phase === "debate" || phase === "verdict") && (
        <div className="flex flex-1 overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* Topic badge */}
            <div className="flex justify-center mb-6">
              <div className="px-4 py-2 rounded-full text-xs font-medium text-slate-400 border border-[#2A2A3A] bg-[#16161F]">
                📌 {effectiveTopic}
              </div>
            </div>

            {/* Round indicators */}
            {messages.length === 0 && isRunning && (
              <div className="text-center text-slate-600 text-sm animate-pulse-slow">Дебаты начинаются...</div>
            )}

            {messages.map((msg, idx) => {
              const prevMsg = messages[idx - 1];
              const showRound = !prevMsg || prevMsg.round !== msg.round;
              return (
                <div key={msg.id}>
                  {showRound && (
                    <div className="flex items-center gap-3 my-4">
                      <div className="flex-1 h-px bg-[#2A2A3A]" />
                      <span className="text-xs text-slate-600 font-display uppercase tracking-widest">Раунд {msg.round}</span>
                      <div className="flex-1 h-px bg-[#2A2A3A]" />
                    </div>
                  )}
                  <MessageBubble msg={msg} />
                </div>
              );
            })}

            {/* Typing indicator */}
            {typingBot && (
              <div className={`flex ${typingBot === "alpha" ? "justify-start" : "justify-end"} mb-3`}>
                <div className="rounded-2xl border" style={{
                  border: `1px solid ${BOTS[typingBot].color}30`,
                  background: typingBot === "alpha" ? "rgba(59,130,246,0.08)" : "rgba(249,115,22,0.08)"
                }}>
                  <TypingIndicator color={BOTS[typingBot].color} />
                </div>
              </div>
            )}

            {/* Arbiter loading */}
            {isArbitraging && (
              <div className="flex justify-center my-6">
                <div className="px-6 py-4 rounded-2xl border border-purple-500/30 bg-[#1A1A2E] glow-purple animate-pulse-slow">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">⚖️</span>
                    <div>
                      <div className="text-purple-400 text-sm font-semibold">Арбитр анализирует дебаты</div>
                      <div className="text-slate-500 text-xs mt-0.5">Это займёт несколько секунд...</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Sidebar */}
          <div className="w-72 border-l border-[#2A2A3A] overflow-y-auto p-4 flex flex-col gap-4" style={{ background: "#16161F" }}>
            {/* Round progress */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-display font-semibold text-slate-400 uppercase tracking-widest">Прогресс</span>
                <span className="text-xs text-slate-600">{Math.min(currentRound, maxRounds)}/{maxRounds}</span>
              </div>
              <div className="flex gap-1">
                {Array.from({ length: maxRounds }).map((_, i) => (
                  <div key={i} className="flex-1 h-2 rounded-full transition-all duration-500"
                    style={{ background: i < currentRound ? "#3B82F6" : "#2A2A3A" }} />
                ))}
              </div>
            </div>

            {/* Stats */}
            <div>
              <h3 className="text-xs font-display font-semibold text-slate-400 uppercase tracking-widest mb-3">Статистика</h3>
              <StatBar label="Всего слов" alphaVal={stats.alpha.totalWords} betaVal={stats.beta.totalWords} />
              <StatBar label="Реплик" alphaVal={stats.alpha.messages} betaVal={stats.beta.messages} />
              <StatBar label="Слов/реплика" alphaVal={stats.alpha.avgWordsPerMessage} betaVal={stats.beta.avgWordsPerMessage} />
              <div className="mt-2">
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span className="text-blue-400">{stats.alpha.agreementRate} раз согласился</span>
                  <span className="text-orange-400">{stats.beta.agreementRate} раз согласился</span>
                </div>
              </div>
            </div>

            {/* Controls */}
            {isRunning && (
              <button
                onClick={stopDebate}
                className="w-full py-2 rounded-lg text-xs text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-colors"
              >
                ⏹ Остановить
              </button>
            )}

            {/* Verdict */}
            {arbiterResult && phase === "verdict" && (
              <div className="rounded-xl p-4 border glow-purple" style={{ borderColor: `${winnerColor}40`, background: `${winnerColor}08` }}>
                <div className="text-center mb-3">
                  <div className="text-2xl mb-1">🏆</div>
                  <div className="font-display font-bold text-lg" style={{ color: winnerColor }}>
                    {arbiterResult.winner}
                  </div>
                  <div className="text-xs text-slate-500">победитель</div>
                </div>

                {arbiterResult.alphaScore !== undefined && (
                  <div className="mb-3">
                    <StatBar label="Счёт" alphaVal={arbiterResult.alphaScore} betaVal={arbiterResult.betaScore || 0} isPercent />
                  </div>
                )}

                <p className="text-xs text-slate-400 leading-relaxed mb-3">{arbiterResult.verdict}</p>

                {arbiterResult.mostPersuasiveArg && (
                  <div className="p-2 rounded-lg bg-[#0D0D14] border border-[#2A2A3A]">
                    <div className="text-xs text-purple-400 font-semibold mb-1">💡 Лучший аргумент</div>
                    <p className="text-xs text-slate-400">{arbiterResult.mostPersuasiveArg}</p>
                  </div>
                )}

                <button
                  onClick={resetDebate}
                  className="w-full mt-3 py-2 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90"
                  style={{ background: "linear-gradient(135deg, #3B82F6, #6366F1)" }}
                >
                  ⚔️ Новые дебаты
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
