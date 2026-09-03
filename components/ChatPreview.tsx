"use client";

import { useEffect, useRef, useState } from "react";

type Bubble = {
  from: "customer" | "agent";
  text: string;
  time: string;
  typing?: boolean;
};

const SCRIPT: Bubble[] = [
  {
    from: "customer",
    text: "Salam! Wakha kayn awd bezzaf?",
    time: "09:41",
  },
  {
    from: "agent",
    text: "Salam 👋 Bghiti tʿawn, 3andi chwiya d suʾalat lk. Fhassab sʿib l ghadi njawbek ghir daba!",
    time: "09:41",
  },
  {
    from: "customer",
    text: "Wakha! Chhal katkellef lajiha d iPhone 15?",
    time: "09:42",
  },
  {
    from: "agent",
    text: "La version d 128GB katkellef 9,500 DH. Wakha ngheddik f prix mzyan ilda chrit 2 wla bezzaf?",
    time: "09:42",
  },
  {
    from: "customer",
    text: "Wakha, bghit nʿref ilda kayna livraison l Fès.",
    time: "09:43",
  },
  {
    from: "agent",
    text: "Ah, livraison l Fès katwsel f 24h 🚚. Wakha tʿawnk f payment cash wla vip?",
    time: "09:43",
  },
  {
    from: "customer",
    text: "Ghir cash. Kifech nʿemel commande?",
    time: "09:44",
  },
  {
    from: "agent",
    text: "Smi7li! Hada smiytek w n° dialk bach nʿemlo commande daba 💳",
    time: "09:44",
  },
];

function formatTime(d: Date) {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function ChatPreview() {
  const [index, setIndex] = useState(0);
  const [now, setNow] = useState<Date | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (index >= SCRIPT.length) return;
    const t = setTimeout(() => setIndex((i) => i + 1), 1500);
    return () => clearTimeout(t);
  }, [index]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [index, now]);

  const visible = SCRIPT.slice(0, index);
  const lastIsCustomer = index > 0 && SCRIPT[index - 1]?.from === "customer";

  return (
    <div className="relative w-full">
      {/* Phone frame */}
      <div className="relative mx-auto max-w-sm overflow-hidden rounded-[2.5rem] border border-white/10 bg-[#0b0f1a] shadow-2xl shadow-fuchsia-500/10">
        {/* Top notch + header */}
        <div className="relative flex items-center gap-3 border-b border-white/5 bg-[#0d1220] px-5 py-4">
          <div className="absolute left-1/2 top-2 h-5 w-24 -translate-x-1/2 rounded-full bg-black" />
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-linear-to-br from-fuchsia-500 to-blue-600 text-lg font-bold text-white shadow-lg shadow-blue-600/30">
            IA
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">
              Assistant IA
            </p>
            <p className="flex items-center gap-1.5 text-xs text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              En ligne · répond en 2 s
            </p>
          </div>
          <div className="ml-auto flex gap-2 text-gray-400">
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M3 5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H7l-4 4V5z"
              />
            </svg>
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M5 12h14M12 5l7 7-7 7"
              />
            </svg>
          </div>
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="h-104 space-y-2.5 overflow-y-auto bg-[#0b0f1a] px-4 py-5"
        >
          {visible.map((m, i) => {
            const isCustomer = m.from === "customer";
            return (
              <div
                key={i}
                className={`flex ${isCustomer ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-snug ${
                    isCustomer
                      ? "rounded-br-sm bg-linear-to-br from-fuchsia-600 to-blue-600 text-white"
                      : "rounded-bl-sm bg-[#1a2133] text-gray-100"
                  }`}
                >
                  <p>{m.text}</p>
                  <p
                    className={`mt-1 text-[10px] ${
                      isCustomer ? "text-blue-100/70" : "text-gray-500"
                    }`}
                  >
                    {now ? formatTime(now) : m.time}
                  </p>
                </div>
              </div>
            );
          })}

          {/* Typing indicator when agent is about to reply */}
          {lastIsCustomer && (
            <div className="flex justify-start">
              <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-[#1a2133] px-4 py-3">
                {[0, 1, 2].map((d) => (
                  <span
                    key={d}
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400"
                    style={{ animationDelay: `${d * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Input bar */}
        <div className="flex items-center gap-2 border-t border-white/5 bg-[#0d1220] px-4 py-3">
          <div className="flex h-9 flex-1 items-center rounded-full bg-[#1a2133] px-4 text-sm text-gray-400">
            Écris un message…
          </div>
          <button className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/30">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Floating badge chips */}
      <div className="pointer-events-none absolute -left-4 top-24 hidden animate-pulse sm:block">
        <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-300 backdrop-blur">
          ⚡ 2s réponse
        </div>
      </div>
      <div className="pointer-events-none absolute -right-4 bottom-32 hidden animate-pulse sm:block">
        <div className="rounded-xl border border-fuchsia-400/30 bg-fuchsia-500/10 px-3 py-2 text-xs font-medium text-fuchsia-300 backdrop-blur">
          🧠 IA avancée
        </div>
      </div>
    </div>
  );
}
