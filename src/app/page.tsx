"use client";
import { useState, useRef, useEffect } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type BotId = "alpha" | "beta" | "gamma" | "delta";

interface BotConfig {
  id: BotId;
  name: string;
  personality: string;
  color: string;
  emoji: string;
  position: "for" | "against";
}

interface Message {
  id: string;
  botId: BotId;
  text: string;
  wordCount: number;
  round: number;
  agreementScore: number;
}

// ─── Bot configs ──────────────────────────────────────────────────────────────

const ALL_BOTS: Record<BotId, Omit<BotConfig, "position">> = {
  alpha: { id: "alpha", name: "ALPHA", personality: "Агрессивный оптимист", color: "#3B82F6", emoji: "🔵" },
  beta:  { id: "beta",  name: "BETA",  personality: "Скептичный аналитик",  color: "#F97316", emoji: "🟠" },
  gamma: { id: "gamma", name: "GAMMA", personality: "Философ-мечтатель",    color: "#A855F7", emoji: "🟣" },
  delta: { id: "delta", name: "DELTA", personality: "Прагматик",             color: "#10B981", emoji: "🟢" },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function DebateArena() {
  const [topic, setTopic] = useState("");
  const [botA, setBotA] = useState<BotId>("alpha");
  const [botB, setBotB] = useState<BotId>("beta");
  const [maxRounds, setMaxRounds] = useState(4);
  const [messages, setMessages] = useState<Message[]>([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [winner, setWinner] = useState<BotId | "draw" | null>(null);
  const [currentRound, setCurrentRound] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [stats, setStats] = useState<Record<BotId, { words: number; agreements: number; messages: number }>>({
    alpha: { words: 0, agreements: 0, messages: 0 },
    beta:  { words: 0, agreements: 0, messages: 0 },
    gamma: { words: 0, agreements: 0, messages: 0 },
    delta: { words: 0, agreements: 0, messages: 0 },
  });
  const abortRef = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const configA: BotConfig = { ...ALL_BOTS[botA], position: "for" };
  const configB: BotConfig = { ...ALL_BOTS[botB], position: "against" };

  async function callBot(
    botId: BotId,
    position: "for" | "against",
    history: { role: "user" | "assistant"; content: string }[],
    round: number
  ): Promise<Message | null> {
    try {
      const res = await fetch("/api/debate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ botId, topic, history, position }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error ?? "Ошибка API");
        return null;
      }
      return {
        id: `${botId}-${round}-${Date.now()}`,
        botId,
        text: data.text,
        wordCount: data.wordCount ?? data.text.split(/\s+/).filter(Boolean).length,
        round,
        agreementScore: data.agreementScore ?? 0.1,
      };
    } catch (e: any) {
      setError(e.message);
      return null;
    }
  }

  async function startDebate() {
    if (!topic.trim()) return;
    abortRef.current = false;
    setMessages([]);
    setStats({ alpha: { words:0,agreements:0,messages:0 }, beta: { words:0,agreements:0,messages:0 }, gamma: { words:0,agreements:0,messages:0 }, delta: { words:0,agreements:0,messages:0 } });
    setWinner(null);
    setDone(false);
    setError(null);
    setStarted(true);
    setRunning(true);

    const historyA: { role: "user" | "assistant"; content: string }[] = [];
    const historyB: { role: "user" | "assistant"; content: string }[] = [];
    const allMessages: Message[] = [];

    for (let round = 1; round <= maxRounds; round++) {
      if (abortRef.current) break;
      setCurrentRound(round);

      // Bot A speaks
      const msgA = await callBot(botA, "for", historyA, round);
      if (!msgA || abortRef.current) break;

      allMessages.push(msgA);
      setMessages([...allMessages]);
      setStats(prev => ({
        ...prev,
        [botA]: {
          words: prev[botA].words + msgA.wordCount,
          agreements: prev[botA].agreements + (msgA.agreementScore > 0.5 ? 1 : 0),
          messages: prev[botA].messages + 1,
        }
      }));

      // Update histories
      historyA.push({ role: "assistant", content: msgA.text });
      historyB.push({ role: "user", content: msgA.text });

      await new Promise(r => setTimeout(r, 800));
      if (abortRef.current) break;

      // Bot B speaks
      const msgB = await callBot(botB, "against", historyB, round);
      if (!msgB || abortRef.current) break;

      allMessages.push(msgB);
      setMessages([...allMessages]);
      setStats(prev => ({
        ...prev,
        [botB]: {
          words: prev[botB].words + msgB.wordCount,
          agreements: prev[botB].agreements + (msgB.agreementScore > 0.5 ? 1 : 0),
          messages: prev[botB].messages + 1,
        }
      }));

      historyB.push({ role: "assistant", content: msgB.text });
      historyA.push({ role: "user", content: msgB.text });

      await new Promise(r => setTimeout(r, 800));
    }

    if (!abortRef.current) {
      // Determine winner: more words + lower agreement (more assertive)
      const scoreA = stats[botA].words - stats[botA].agreements * 10;
      const scoreB = stats[botB].words - stats[botB].agreements * 10;
      setWinner(scoreA > scoreB ? botA : scoreA < scoreB ? botB : "draw");
      setDone(true);
    }
    setRunning(false);
  }

  function stopDebate() {
    abortRef.current = true;
    setRunning(false);
  }

  function reset() {
    abortRef.current = true;
    setStarted(false);
    setMessages([]);
    setDone(false);
    setWinner(null);
    setError(null);
    setCurrentRound(0);
    setRunning(false);
  }

  // Group messages by round
  const rounds: Record<number, Message[]> = {};
  for (const m of messages) {
    if (!rounds[m.round]) rounds[m.round] = [];
    rounds[m.round].push(m);
  }

  const botAConfig = ALL_BOTS[botA];
  const botBConfig = ALL_BOTS[botB];

  return (
    <div style={{ minHeight: "100vh", background: "#0f1117", color: "#e2e8f0", fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <header style={{ background: "#1a1d2e", borderBottom: "1px solid #2d3148", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 24 }}>⚔️</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18, letterSpacing: 2, color: "#fff" }}>AI DEBATE ARENA</div>
            <div style={{ fontSize: 11, color: "#64748b" }}>Два ИИ. Одна тема. Кто убедительнее?</div>
          </div>
        </div>
        {started && (
          <button onClick={reset} style={{ background: "#1e293b", border: "1px solid #334155", color: "#94a3b8", padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>
            ↩ Сначала
          </button>
        )}
      </header>

      {!started ? (
        /* Setup screen */
        <div style={{ maxWidth: 600, margin: "60px auto", padding: "0 20px" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>⚔️</div>
            <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, color: "#fff" }}>Новые дебаты</h1>
            <p style={{ color: "#64748b", marginTop: 8 }}>Выберите участников и тему</p>
          </div>

          {/* Topic */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", marginBottom: 8, fontSize: 13, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Тема дебатов</label>
            <input
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="Например: Искусственный интеллект опасен для человечества"
              style={{ width: "100%", background: "#1a1d2e", border: "1px solid #2d3148", borderRadius: 10, padding: "14px 16px", color: "#fff", fontSize: 15, outline: "none", boxSizing: "border-box" }}
              onKeyDown={e => e.key === "Enter" && topic.trim() && startDebate()}
            />
          </div>

          {/* Bot selection */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
            {[{ label: "Участник А (За)", value: botA, set: setBotA }, { label: "Участник Б (Против)", value: botB, set: setBotB }].map(({ label, value, set }) => (
              <div key={label}>
                <label style={{ display: "block", marginBottom: 8, fontSize: 13, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>{label}</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {(Object.keys(ALL_BOTS) as BotId[]).map(id => {
                    const b = ALL_BOTS[id];
                    const selected = value === id;
                    return (
                      <button key={id} onClick={() => set(id)}
                        style={{ background: selected ? `${b.color}22` : "#1a1d2e", border: `1px solid ${selected ? b.color : "#2d3148"}`, borderRadius: 8, padding: "10px 14px", cursor: "pointer", textAlign: "left", color: selected ? "#fff" : "#94a3b8", transition: "all 0.15s" }}>
                        <span style={{ marginRight: 8 }}>{b.emoji}</span>
                        <span style={{ fontWeight: 700, fontSize: 13 }}>{b.name}</span>
                        <span style={{ fontSize: 11, marginLeft: 8, opacity: 0.7 }}>{b.personality}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Rounds */}
          <div style={{ marginBottom: 32 }}>
            <label style={{ display: "block", marginBottom: 8, fontSize: 13, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Количество раундов: {maxRounds}</label>
            <input type="range" min={2} max={8} value={maxRounds} onChange={e => setMaxRounds(+e.target.value)}
              style={{ width: "100%", accentColor: "#6366f1" }} />
          </div>

          <button onClick={startDebate} disabled={!topic.trim() || botA === botB}
            style={{ width: "100%", background: topic.trim() && botA !== botB ? "linear-gradient(135deg, #6366f1, #8b5cf6)" : "#1e293b", border: "none", borderRadius: 12, padding: "16px", color: topic.trim() && botA !== botB ? "#fff" : "#475569", fontSize: 16, fontWeight: 700, cursor: topic.trim() && botA !== botB ? "pointer" : "not-allowed", letterSpacing: 1 }}>
            ⚔️ НАЧАТЬ ДЕБАТЫ
          </button>
          {botA === botB && <p style={{ color: "#ef4444", fontSize: 12, textAlign: "center", marginTop: 8 }}>Выберите разных участников</p>}
        </div>
      ) : (
        /* Debate screen */
        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", height: "calc(100vh - 57px)" }}>
          {/* Main debate area */}
          <div style={{ overflowY: "auto", padding: "24px 32px" }}>
            {Object.entries(rounds).map(([r, msgs]) => (
              <div key={r}>
                <div style={{ textAlign: "center", margin: "24px 0 16px", color: "#475569", fontSize: 12, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase" }}>
                  ─── РАУНД {r} ───
                </div>
                {msgs.map(msg => {
                  const isA = msg.botId === botA;
                  const cfg = ALL_BOTS[msg.botId];
                  return (
                    <div key={msg.id} style={{ display: "flex", justifyContent: isA ? "flex-start" : "flex-end", marginBottom: 16 }}>
                      <div style={{ maxWidth: "70%" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, justifyContent: isA ? "flex-start" : "flex-end" }}>
                          <span style={{ color: cfg.color, fontWeight: 800, fontSize: 13, letterSpacing: 1 }}>{cfg.emoji} {cfg.name}</span>
                          <span style={{ background: "#1e293b", color: "#64748b", fontSize: 10, padding: "2px 8px", borderRadius: 20 }}>R{msg.round}</span>
                          <span style={{ color: "#475569", fontSize: 11 }}>{msg.wordCount} сл.</span>
                        </div>
                        <div style={{ background: isA ? "#1a2744" : "#2a1a10", border: `1px solid ${cfg.color}44`, borderRadius: isA ? "4px 16px 16px 16px" : "16px 4px 16px 16px", padding: "14px 18px", lineHeight: 1.65, fontSize: 14, color: "#e2e8f0" }}>
                          {msg.text}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}

            {/* Loading indicator */}
            {running && (
              <div style={{ textAlign: "center", padding: 24, color: "#64748b" }}>
                <div style={{ fontSize: 24, animation: "pulse 1s infinite" }}>⚡</div>
                <div style={{ fontSize: 13, marginTop: 8 }}>Раунд {currentRound} из {maxRounds}...</div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div style={{ background: "#2d1b1b", border: "1px solid #ef4444", borderRadius: 10, padding: "16px 20px", color: "#fca5a5", margin: "16px 0" }}>
                ⚠️ Ошибка: {error}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Sidebar */}
          <div style={{ background: "#13151f", borderLeft: "1px solid #1e2538", padding: 20, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Topic */}
            <div style={{ background: "#1a1d2e", borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 10, color: "#475569", fontWeight: 700, letterSpacing: 2, marginBottom: 6 }}>ТЕМА</div>
              <div style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.5 }}>{topic}</div>
            </div>

            {/* Score bar */}
            <div style={{ background: "#1a1d2e", borderRadius: 10, padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 12, fontWeight: 700 }}>
                <span style={{ color: botAConfig.color }}>{botAConfig.name}</span>
                <span style={{ color: "#475569" }}>Слов</span>
                <span style={{ color: botBConfig.color }}>{botBConfig.name}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 12 }}>
                <span style={{ color: "#cbd5e1" }}>{stats[botA].words}</span>
                <span style={{ color: "#cbd5e1" }}>{stats[botB].words}</span>
              </div>
              {/* Visual bar */}
              {(stats[botA].words + stats[botB].words) > 0 && (
                <div style={{ display: "flex", borderRadius: 4, overflow: "hidden", height: 8 }}>
                  <div style={{ flex: stats[botA].words, background: botAConfig.color, transition: "flex 0.5s" }} />
                  <div style={{ flex: stats[botB].words, background: botBConfig.color, transition: "flex 0.5s" }} />
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: 11, color: "#64748b" }}>
                <span>{stats[botA].agreements} раз согл.</span>
                <span>{stats[botB].agreements} раз согл.</span>
              </div>
            </div>

            {/* Progress */}
            <div style={{ background: "#1a1d2e", borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 10, color: "#475569", fontWeight: 700, letterSpacing: 2, marginBottom: 10 }}>ПРОГРЕСС</div>
              <div style={{ display: "flex", gap: 6 }}>
                {Array.from({ length: maxRounds }, (_, i) => i + 1).map(r => (
                  <div key={r} style={{ flex: 1, height: 6, borderRadius: 3, background: r <= currentRound ? "#6366f1" : "#2d3148", transition: "background 0.3s" }} />
                ))}
              </div>
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 6 }}>Раунд {currentRound} / {maxRounds}</div>
            </div>

            {/* Winner */}
            {done && winner && (
              <div style={{ background: winner === "draw" ? "#1a1d2e" : `${ALL_BOTS[winner as BotId]?.color ?? "#6366f1"}22`, border: `1px solid ${winner === "draw" ? "#334155" : ALL_BOTS[winner as BotId]?.color ?? "#6366f1"}`, borderRadius: 12, padding: 20, textAlign: "center" }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>🏆</div>
                <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4, fontWeight: 700, letterSpacing: 2 }}>ПОБЕДИТЕЛЬ</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: winner === "draw" ? "#94a3b8" : ALL_BOTS[winner as BotId]?.color }}>
                  {winner === "draw" ? "НИЧЬЯ" : `${ALL_BOTS[winner as BotId]?.emoji} ${ALL_BOTS[winner as BotId]?.name}`}
                </div>
                <button onClick={reset} style={{ marginTop: 16, width: "100%", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", border: "none", borderRadius: 8, padding: "12px", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
                  ✨ Новые дебаты
                </button>
              </div>
            )}

            {/* Stop button */}
            {running && (
              <button onClick={stopDebate} style={{ background: "#2d1b1b", border: "1px solid #ef444444", borderRadius: 8, padding: "12px", color: "#ef4444", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
                ⏹ Остановить
              </button>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        input[type=range]::-webkit-slider-thumb { cursor:pointer }
        ::-webkit-scrollbar { width:6px } ::-webkit-scrollbar-track { background:#0f1117 } ::-webkit-scrollbar-thumb { background:#2d3148; border-radius:3px }
      `}</style>
    </div>
  );
}
