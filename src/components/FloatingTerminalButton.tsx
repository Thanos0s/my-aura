"use client";

import { useState } from "react";
import { X } from "lucide-react";

export function FloatingTerminalButton() {
  const [active, setActive] = useState(false);

  return (
    <>
      {/* Floating Terminal Button */}
      <button
        type="button"
        className="terminal-glow-btn"
        aria-label="Heart Terminal Button"
        title="My Aura Health Terminal"
        onClick={() => setActive((v) => !v)}
      >
        <svg className="glowing-heart" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
      </button>

      {/* Interactive Quick Terminal Panel */}
      {active && (
        <div className="fixed bottom-24 left-8 z-[9999] w-80 rounded-3xl bg-[#18313c] text-white p-5 shadow-2xl border border-sky-500/30 backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-sky-200">
                Aura Vitals Terminal
              </span>
            </div>
            <button
              type="button"
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              onClick={() => setActive(false)}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-3 space-y-2 text-xs">
            <div className="flex justify-between rounded-2xl bg-white/5 p-2.5 border border-white/5">
              <span className="text-slate-300">Pulse / Rate</span>
              <span className="font-mono font-bold text-sky-300">88 bpm · Steady</span>
            </div>
            <div className="flex justify-between rounded-2xl bg-white/5 p-2.5 border border-white/5">
              <span className="text-slate-300">Dosha Equilibrium</span>
              <span className="font-mono font-bold text-emerald-300">Vata-Pitta Balance</span>
            </div>
            <div className="flex justify-between rounded-2xl bg-white/5 p-2.5 border border-white/5">
              <span className="text-slate-300">Signal Engine</span>
              <span className="font-mono font-bold text-sky-200">Sarvam ASR & OCR </span>
            </div>
          </div>

          <p className="mt-3 text-[10px] text-slate-400 font-mono text-center">
            My Aura AYUSH Clinical Intelligence 
          </p>
        </div>
      )}
    </>
  );
}
