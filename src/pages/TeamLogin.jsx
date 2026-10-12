import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useGame } from '../contexts/GameContext';

const TeamLogin = () => {
  const [teamCode, setTeamCode] = useState('');
  const [error, setError] = useState('');
  const [successInfo, setSuccessInfo] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useGame();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessInfo(null);
    setIsSubmitting(true);

    try {
      const res = await login('team', { teamCode });
      if (res.success && res.team) {
        try {
          sessionStorage.setItem('traz_team_id', res.team.id);
          if (res.team.game_id) {
            sessionStorage.setItem('traz_game_id', res.team.game_id);
          }
          if (res.team.opponent_id) {
            sessionStorage.setItem('traz_opponent_id', res.team.opponent_id);
          }
        } catch (storageErr) {
          console.warn('[TeamLogin] sessionStorage error:', storageErr);
        }

        setSuccessInfo({
          name: res.team.name,
          teamId: res.team.id,
          isFirstLogin: res.user.isFirstLogin
        });

        // Short dramatic transition delay to display the team name recognition
        setTimeout(() => {
          navigate(`/team/${res.team.id}`);
        }, 1200);
      } else {
        setError(res.error || 'Team identification rejected. Access code invalid.');
      }
    } catch (err) {
      setError(err.message || 'System fault encountered');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-gray-950 text-green-400 font-mono flex flex-col justify-between select-none animate-scan-line">
      {/* Background Matrix/Grid Aesthetic */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(34,197,94,0.1)_0%,_rgba(3,7,18,0.98)_100%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#052e1615_1px,transparent_1px),linear-gradient(to_bottom,#052e1615_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] pointer-events-none" />

      {/* Top Bar */}
      <header className="relative z-10 w-full border-b border-green-500/20 bg-gray-950/80 px-6 py-3 flex items-center justify-between text-xs">
        <Link 
          to="/" 
          className="flex items-center gap-2 text-green-500/80 hover:text-green-300 transition-colors"
        >
          <span>&larr;</span>
          <span className="uppercase font-semibold tracking-wider">RETURN TO GATEWAY</span>
        </Link>
        <span className="text-green-500/60 uppercase">NODE: SQUAD_TERMINAL</span>
      </header>

      {/* Main Container */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md cyber-window bg-gray-900/90 border border-green-500/50 rounded-lg shadow-[0_0_35px_rgba(34,197,94,0.2)] overflow-hidden backdrop-blur-md">
          {/* Header */}
          <div className="cyber-window-header flex items-center justify-between px-4 py-2 bg-gray-950 border-b border-green-500/40">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-green-400 font-bold tracking-wider">
                NODE_AUTHENTICATOR // TEAM_OS
              </span>
            </div>
            <span className="text-[10px] text-green-500/70 border border-green-500/30 px-1.5 py-0.5 rounded">
              DEFENSE_DECK
            </span>
          </div>

          <div className="p-6">
            <div className="text-center mb-6">
              <div className="inline-block p-2 rounded-full border border-green-500/30 bg-green-950/40 mb-2">
                <svg className="w-7 h-7 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h2 className="text-2xl font-black tracking-widest text-green-400">
                TEAM TERMINAL ACCESS
              </h2>
              <p className="mt-1 text-xs text-green-500/70 font-mono">
                Input squad security token to initialize your WebOS workspace.
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-5 p-3 rounded bg-red-950/70 border border-red-500/60 text-red-400 text-xs flex items-center gap-3 animate-glitch">
                <span className="font-bold text-red-300">[REJECTED]</span>
                <span className="font-mono">{error}</span>
              </div>
            )}

            {/* Success Recognition Banner */}
            {successInfo && (
              <div className="mb-5 p-4 rounded bg-green-950/80 border border-green-400 text-green-300 text-xs space-y-1 animate-pulse-glow">
                <div className="font-bold text-sm tracking-wider flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-green-400" />
                  AUTHENTICATION CONFIRMED: {successInfo.name}
                </div>
                <div className="text-green-400/80 text-[11px]">
                  &gt; INITIALIZING ENVIRONMENT FOR TEAM ID: {successInfo.teamId.slice(0, 8)}...
                </div>
                {successInfo.isFirstLogin && (
                  <div className="text-yellow-400 text-[11px] font-semibold">
                    &gt; FIRST BOOT PROTOCOL ENGAGED: SYSTEM RECONNAISSANCE ACTIVE
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-green-400/90 mb-2">
                  &gt; ENTER TEAM ACCESS CODE
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={teamCode}
                    onChange={(e) => setTeamCode(e.target.value.toUpperCase())}
                    required
                    autoFocus
                    placeholder="e.g. ALPHA-9274 OR TEAM_A"
                    className="w-full bg-black/80 border-2 border-green-500/50 focus:border-green-300 focus:ring-2 focus:ring-green-400/40 text-green-300 font-mono text-base tracking-widest px-4 py-3 rounded outline-none transition-all placeholder-green-800 text-center uppercase"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isSubmitting || !!successInfo}
                  className="w-full py-3 px-4 bg-green-600 hover:bg-green-500 text-black font-extrabold uppercase tracking-widest text-xs rounded transition-all duration-200 shadow-[0_0_20px_rgba(34,197,94,0.4)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      <span>RESOLVING CREDENTIALS...</span>
                    </>
                  ) : successInfo ? (
                    <span>INITIALIZING WEB_OS...</span>
                  ) : (
                    <span>LAUNCH TERMINAL &gt;&gt;</span>
                  )}
                </button>
              </div>
            </form>

            <div className="mt-6 pt-4 border-t border-green-500/20 text-center text-[11px] text-green-500/60 font-mono">
              Provide this key only to verified tactical squad members.
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full border-t border-green-500/10 bg-gray-950/80 px-6 py-2.5 flex items-center justify-between text-[10px] text-green-500/40">
        <span>TRAZ CTF // SQUAD INTERFACE MATRIX // SYSTEM PORTAL</span>
        <span className="font-mono text-green-500/60">Made by Taha</span>
      </footer>
    </div>
  );
};

export default TeamLogin;
