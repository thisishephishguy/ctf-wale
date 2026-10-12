import React from 'react';

/**
 * DevToolsWarning Component
 * Standalone anti-cheat warning modal shown before entering CTF game sessions.
 * Explains DevTools restriction and consequences of rule violations.
 */
export default function DevToolsWarning({ onAcknowledge }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 select-none font-mono text-gray-200">
      <div className="relative max-w-lg w-full bg-slate-950 border-2 border-red-600 rounded-2xl p-6 sm:p-8 shadow-[0_0_50px_rgba(220,38,38,0.5)] overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-amber-500 to-red-600" />

        {/* Warning Icon & Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-red-950/80 border-2 border-red-500 flex items-center justify-center text-red-500 mb-4 shadow-[0_0_20px_rgba(239,68,68,0.4)] animate-pulse">
            <svg
              className="w-9 h-9"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-widest text-red-500 uppercase">
            ⚠️ ANTI-CHEAT WARNING
          </h2>
          <p className="text-xs uppercase tracking-widest text-red-300/80 mt-1">
            INTEGRITY ENFORCEMENT PROTOCOL ACTIVE
          </p>
        </div>

        {/* Rule Explanation */}
        <div className="space-y-3 mb-6 text-xs sm:text-sm text-gray-300 leading-relaxed bg-black/60 border border-red-900/50 rounded-xl p-4">
          <div className="flex items-start space-x-2">
            <span className="text-red-500 font-bold shrink-0">▪</span>
            <p>
              Opening browser Developer Tools (<span className="text-amber-400 font-bold">F12</span>, <span className="text-amber-400 font-bold">Ctrl+Shift+I</span>, <span className="text-amber-400 font-bold">Inspect Element</span>, etc.) during this session will result in <span className="text-red-400 font-black uppercase underline">IMMEDIATE DISQUALIFICATION</span>.
            </p>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-red-500 font-bold shrink-0">▪</span>
            <p>
              Your team will <strong className="text-red-400 font-bold">automatically forfeit</strong> the match upon detection.
            </p>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-red-500 font-bold shrink-0">▪</span>
            <p className="text-amber-300 font-semibold">
              Do <span className="underline">NOT</span> open DevTools, inspect DOM, or view page source at any point during the game.
            </p>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={onAcknowledge}
          type="button"
          className="w-full py-3.5 px-4 bg-gradient-to-r from-red-600 via-red-500 to-amber-600 hover:from-red-500 hover:to-amber-500 text-black font-black text-xs sm:text-sm tracking-widest uppercase rounded-xl shadow-lg shadow-red-950/80 transition-all duration-200 active:scale-[0.98] cursor-pointer"
        >
          I UNDERSTAND AND AGREE
        </button>
      </div>
    </div>
  );
}
