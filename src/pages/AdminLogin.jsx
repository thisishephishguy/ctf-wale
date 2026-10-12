import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useGame } from '../contexts/GameContext';

const AdminLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useGame();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const res = await login('admin', { username, password });
      if (res.success) {
        navigate('/admin/dashboard');
      } else {
        setError(res.error || 'Authentication failure: ACCESS_DENIED');
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
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(16,185,129,0.08)_0%,_rgba(3,7,18,0.95)_100%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#052e1610_1px,transparent_1px),linear-gradient(to_bottom,#052e1610_1px,transparent_1px)] bg-[size:3rem_3rem] pointer-events-none" />

      {/* Top Bar */}
      <header className="relative z-10 w-full border-b border-green-500/20 bg-gray-950/80 px-6 py-3 flex items-center justify-between text-xs">
        <Link 
          to="/" 
          className="flex items-center gap-2 text-green-500/80 hover:text-green-300 transition-colors"
        >
          <span>&larr;</span>
          <span className="uppercase font-semibold tracking-wider">RETURN TO GATEWAY</span>
        </Link>
        <span className="text-green-500/50 uppercase">CLEARANCE: ROOT_ADMIN</span>
      </header>

      {/* Login Terminal Box */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md cyber-window bg-gray-900/90 border border-green-500/40 rounded-lg shadow-[0_0_35px_rgba(34,197,94,0.15)] overflow-hidden backdrop-blur-md">
          {/* Header */}
          <div className="cyber-window-header flex items-center justify-between px-4 py-2 bg-gray-950 border-b border-green-500/30">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
              <span className="ml-2 text-xs text-green-400 font-bold tracking-wider">
                ROOT://AUTH_CONTROLLER
              </span>
            </div>
            <span className="text-[10px] text-green-500/60 font-mono">ENCRYPTED</span>
          </div>

          <div className="p-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-black tracking-widest text-green-400 animate-pulse-glow">
                ADMIN ACCESS
              </h2>
              <p className="mt-1 text-xs text-green-500/70 font-mono">
                Security clearance level 5 required for system modulation.
              </p>
            </div>

            {error && (
              <div className="mb-5 p-3 rounded bg-red-950/60 border border-red-500/50 text-red-400 text-xs flex items-center gap-3 animate-glitch">
                <span className="font-bold text-red-400">[!]</span>
                <span className="font-mono">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-green-400/90 mb-1">
                  &gt; USERNAME_ID
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    autoFocus
                    placeholder="admin"
                    className="w-full bg-black/70 border border-green-500/40 focus:border-green-400 focus:ring-1 focus:ring-green-400 text-green-300 font-mono text-sm px-3 py-2.5 rounded outline-none transition-all placeholder-green-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-green-400/90 mb-1">
                  &gt; CIPHER_KEY (PASSWORD)
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••••••"
                    className="w-full bg-black/70 border border-green-500/40 focus:border-green-400 focus:ring-1 focus:ring-green-400 text-green-300 font-mono text-sm px-3 py-2.5 rounded outline-none transition-all placeholder-green-800"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-4 bg-green-950/80 hover:bg-green-600 hover:text-black border border-green-500/60 text-green-400 font-bold uppercase tracking-wider text-xs rounded transition-all duration-200 shadow-[0_0_15px_rgba(34,197,94,0.2)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-3 h-3 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
                      <span>VERIFYING CREDENTIALS...</span>
                    </>
                  ) : (
                    <span>AUTHENTICATE &gt;&gt;</span>
                  )}
                </button>
              </div>
            </form>

            <div className="mt-6 pt-4 border-t border-green-500/20 text-center">
              <span className="text-[11px] text-green-500/50">
                UNAUTHORIZED ACCESS ATTEMPTS LOGGED VIA SEC_IP
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full border-t border-green-500/10 bg-gray-950/80 px-6 py-2.5 flex items-center justify-between text-[10px] text-green-500/40">
        <span>TRAZ CTF // ADMINISTRATIVE CONTROLLER // SYSTEM PORTAL</span>
        <span className="font-mono text-green-500/60">Made by Taha</span>
      </footer>
    </div>
  );
};

export default AdminLogin;
