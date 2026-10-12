import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useGame } from '../contexts/GameContext';

const BridgeLogin = () => {
  const [bridgeCode, setBridgeCode] = useState('');
  const [error, setError] = useState('');
  const [resolvingInfo, setResolvingInfo] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useGame();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setResolvingInfo(null);
    setIsSubmitting(true);

    try {
      const res = await login('bridge', { bridgeCode });
      if (res.success && res.opponentTeamId) {
        try {
          if (res.attackerTeam?.id) {
            sessionStorage.setItem('traz_attacker_team_id', res.attackerTeam.id);
            sessionStorage.setItem('traz_team_id', res.attackerTeam.id);
          }
          sessionStorage.setItem('traz_target_team_id', res.opponentTeamId);
          if (res.attackerTeam?.game_id) {
            sessionStorage.setItem('traz_game_id', res.attackerTeam.game_id);
          }
        } catch (storageErr) {
          console.warn('[BridgeLogin] sessionStorage error:', storageErr);
        }

        setResolvingInfo({
          attacker: res.attackerTeam?.name || 'Authorized Attacker',
          target: res.opponentTeam?.name || 'Target Host',
          opponentId: res.opponentTeamId
        });

        // Dramatic brief countdown/pause to show target acquisition
        setTimeout(() => {
          navigate(`/breach/${res.opponentTeamId}`);
        }, 1200);
      } else {
        setError(res.error || 'Access denied: Breach cipher failed to unlock vector.');
      }
    } catch (err) {
      setError(err.message || 'Intrusion vector failed to establish connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-gray-950 text-red-500 font-mono flex flex-col justify-between select-none animate-scan-line">
      {/* Background Red Pulsing & Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(239,68,68,0.12)_0%,_rgba(3,7,18,0.98)_100%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#450a0a20_1px,transparent_1px),linear-gradient(to_bottom,#450a0a20_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] pointer-events-none" />

      {/* Top Bar with Hazard Styling */}
      <header className="relative z-10 w-full border-b border-red-500/30 bg-gray-950/80 px-6 py-3 flex items-center justify-between text-xs">
        <Link 
          to="/" 
          className="flex items-center gap-2 text-red-400/80 hover:text-red-300 transition-colors"
        >
          <span>&larr;</span>
          <span className="uppercase font-semibold tracking-wider">RETURN TO GATEWAY</span>
        </Link>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
          <span className="text-red-400 font-bold tracking-wider uppercase">
            VECTOR: OFFENSIVE_BRIDGE
          </span>
        </div>
      </header>

      {/* Main Breach Box */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-gray-900/90 border-2 border-red-500/60 rounded-lg shadow-[0_0_40px_rgba(239,68,68,0.25)] overflow-hidden backdrop-blur-md">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-red-950/40 border-b border-red-500/40">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
              <span className="text-xs text-red-400 font-bold tracking-wider">
                INTRUSION_LINK // VECTOR_GATEWAY
              </span>
            </div>
            <span className="text-[10px] text-red-400 bg-red-950/80 border border-red-500/40 px-2 py-0.5 rounded font-bold">
              CLASSIFIED
            </span>
          </div>

          <div className="p-6">
            <div className="text-center mb-6">
              <div className="inline-block p-2 rounded-full border border-red-500/40 bg-red-950/40 mb-2">
                <svg className="w-8 h-8 text-red-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-widest text-red-500 animate-glitch drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]">
                BREACH
              </h1>
              <p className="mt-2 text-xs md:text-sm text-red-400/90 font-bold tracking-widest uppercase">
                Authorized Access Only
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-5 p-3 rounded bg-red-950 border border-red-500 text-red-300 text-xs flex items-center gap-3 animate-glitch">
                <span className="font-bold text-red-400">[BREACH_ABORTED]</span>
                <span className="font-mono">{error}</span>
              </div>
            )}

            {/* Target Resolution Success State */}
            {resolvingInfo && (
              <div className="mb-5 p-4 rounded bg-red-950/80 border-2 border-red-400 text-red-200 text-xs space-y-2 animate-pulse">
                <div className="font-bold text-sm tracking-wider text-red-400">
                  TARGET NODE IDENTIFIED & LOCKED
                </div>
                <div className="text-xs space-y-1 font-mono text-red-300/90">
                  <div>&gt; INTRUSION ORIGIN: {resolvingInfo.attacker}</div>
                  <div>&gt; TARGET ADVERSARY: {resolvingInfo.target}</div>
                  <div className="text-yellow-400 text-[11px]">
                    &gt; TARGET UUID: {resolvingInfo.opponentId.slice(0, 8)}...
                  </div>
                </div>
                <div className="text-[11px] font-bold text-red-400 uppercase pt-1 border-t border-red-500/30">
                  OPENING TACTICAL EXPLOIT CONSOLE...
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-red-400/90 mb-2">
                  &gt; ENTER ACCESS CODE (BRIDGE CIPHER)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={bridgeCode}
                    onChange={(e) => setBridgeCode(e.target.value.toUpperCase())}
                    required
                    autoFocus
                    placeholder="e.g. BRIDGE-DELTA-9 OR SEC-KEY"
                    className="w-full bg-black/80 border-2 border-red-500/50 focus:border-red-400 focus:ring-2 focus:ring-red-500/50 text-red-400 font-mono text-base tracking-widest px-4 py-3 rounded outline-none transition-all placeholder-red-950 text-center uppercase"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isSubmitting || !!resolvingInfo}
                  className="w-full py-3 px-4 bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-widest text-xs rounded transition-all duration-200 shadow-[0_0_25px_rgba(239,68,68,0.5)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>RESOLVING TARGET NODE...</span>
                    </>
                  ) : resolvingInfo ? (
                    <span>INFILTRATING TARGET...</span>
                  ) : (
                    <span>INFILTRATE ADVERSARY &gt;&gt;</span>
                  )}
                </button>
              </div>
            </form>

            <div className="mt-6 pt-4 border-t border-red-500/20 text-center text-[11px] text-red-500/70 font-mono">
              WARNING: UNAUTHORIZED PACKET INJECTION WILL TRIGGER COUNTERMEASURES.
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full border-t border-red-500/20 bg-gray-950/80 px-6 py-2.5 flex items-center justify-between text-[10px] text-red-500/50">
        <span>TRAZ CTF // OFFENSIVE PENETRATION PROTOCOL // SYSTEM PORTAL</span>
        <span className="font-mono text-red-500/60">Made by Taha</span>
      </footer>
    </div>
  );
};

export default BridgeLogin;
