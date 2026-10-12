import React, { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const MatrixBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const chars = '0123456789ABCDEF$#@%&*+-/<>~ΞΨΩλπ';
    const fontSize = 14;
    const columns = Math.floor(canvas.width / fontSize);
    const drops = Array.from({ length: columns }, () => Math.floor(Math.random() * -100));

    const draw = () => {
      ctx.fillStyle = 'rgba(3, 7, 18, 0.12)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#22c55e';
      ctx.font = `${fontSize}px "Courier New", monospace`;

      for (let i = 0; i < drops.length; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        const x = i * fontSize;
        const y = drops[i] * fontSize;

        // Draw faint trailing glyphs and brighter head
        if (Math.random() > 0.95) {
          ctx.fillStyle = '#86efac';
        } else {
          ctx.fillStyle = 'rgba(34, 197, 94, 0.45)';
        }

        ctx.fillText(char, x, y);

        if (y > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none opacity-40 z-0"
    />
  );
};

const HomePage = () => {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen bg-gray-950 text-green-400 font-mono flex flex-col justify-between overflow-x-hidden select-none animate-scan-line">
      {/* Matrix falling code background */}
      <MatrixBackground />

      {/* Subtle radial background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-green-950/20 via-gray-950/80 to-gray-950 pointer-events-none z-0" />

      {/* Cyber Grid Overlay */}
      <div 
        className="absolute inset-0 bg-[linear-gradient(to_right,#052e1615_1px,transparent_1px),linear-gradient(to_bottom,#052e1615_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none z-0" 
      />

      {/* Top Header / Status bar */}
      <header className="relative z-10 w-full border-b border-green-500/20 bg-gray-950/80 backdrop-blur-sm px-6 py-3 flex items-center justify-between text-xs text-green-500/70">
        <div className="flex items-center gap-3">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500 animate-ping" />
          <span className="font-semibold tracking-wider text-green-400 uppercase">
            SECURE GATEWAY // PROTOCOL V4.9
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-6 font-mono text-[11px] text-green-500/60">
          <span>PORT: 3000 [ESTABLISHED]</span>
          <span>SYSTEM INTEGRITY: 99.8%</span>
          <span className="text-green-400 font-bold border border-green-500/40 px-2 py-0.5 rounded bg-green-950/40">
            SYS_ONLINE
          </span>
        </div>
      </header>

      {/* Main Hero & Portals Section */}
      <main className="relative z-10 max-w-6xl w-full mx-auto px-4 py-12 flex-1 flex flex-col items-center justify-center">
        {/* Title Block */}
        <div className="text-center mb-12 max-w-2xl">
          <div className="inline-block mb-3 px-3 py-1 rounded border border-green-500/30 bg-green-950/30 text-green-400 text-xs tracking-widest uppercase">
            DEFENSE & INTRUSION WARFARE SIMULATION
          </div>
          
          <h1 className="text-6xl md:text-8xl font-black tracking-widest text-green-400 animate-glitch drop-shadow-[0_0_25px_rgba(34,197,94,0.4)]">
            TRAZ
          </h1>
          
          <p className="mt-4 text-xl md:text-2xl text-green-300 font-light tracking-wide uppercase">
            Cybersecurity Capture The Flag
          </p>

          <p className="mt-2 text-xs md:text-sm text-green-500/70 font-mono max-w-md mx-auto">
            Dual-team tactical cyber warfare platform. Protect your terminal. Breach the adversary.
          </p>
        </div>

        {/* 3 Interactive Portal Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl">
          {/* Card 1: Admin Access */}
          <Link
            to="/admin"
            className="group relative flex flex-col justify-between p-6 rounded-lg bg-gray-900/80 border border-green-500/30 hover:border-green-400 transition-all duration-300 hover:shadow-[0_0_25px_rgba(34,197,94,0.3)] hover:-translate-y-1 backdrop-blur-md overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 rounded-full blur-2xl group-hover:bg-green-500/15 transition-all" />
            
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded border border-green-500/40 bg-black/50 flex items-center justify-center text-green-400 group-hover:text-green-300 group-hover:scale-105 transition-all shadow-[0_0_10px_rgba(34,197,94,0.2)]">
                  {/* Shield / Command Icon */}
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <span className="text-[10px] font-mono tracking-widest text-green-500/50 uppercase border border-green-500/20 px-2 py-0.5 rounded">
                  PORTAL 01
                </span>
              </div>

              <h2 className="text-xl font-bold tracking-wider text-green-300 group-hover:text-green-200 transition-colors">
                ADMIN ACCESS
              </h2>
              <p className="mt-2 text-xs text-green-500/70 leading-relaxed font-mono">
                Game Master control deck. Launch match instances, monitor team telemetries, and enforce match parameters.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-green-500/20 flex items-center justify-between text-xs font-bold text-green-400 group-hover:text-green-300">
              <span className="tracking-wider">ENTER TERMINAL</span>
              <span className="group-hover:translate-x-1.5 transition-transform duration-200">&gt;&gt;</span>
            </div>
          </Link>

          {/* Card 2: Team Login */}
          <Link
            to="/team-login"
            className="group relative flex flex-col justify-between p-6 rounded-lg bg-gray-900/80 border border-green-500/50 hover:border-green-300 transition-all duration-300 hover:shadow-[0_0_30px_rgba(34,197,94,0.4)] hover:-translate-y-1 backdrop-blur-md overflow-hidden ring-1 ring-green-500/20"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-green-400/10 rounded-full blur-2xl group-hover:bg-green-400/25 transition-all" />
            
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded border border-green-400/60 bg-green-950/40 flex items-center justify-center text-green-400 group-hover:text-green-200 group-hover:scale-105 transition-all shadow-[0_0_15px_rgba(34,197,94,0.3)]">
                  {/* Terminal / Desktop Computer Icon */}
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <span className="text-[10px] font-mono tracking-widest text-green-400 uppercase border border-green-400/40 px-2 py-0.5 rounded bg-green-950/40 font-semibold">
                  PRIMARY
                </span>
              </div>

              <h2 className="text-xl font-bold tracking-wider text-green-300 group-hover:text-green-100 transition-colors">
                TEAM LOGIN
              </h2>
              <p className="mt-2 text-xs text-green-400/80 leading-relaxed font-mono">
                Log into your squad's WebOS terminal. Defend firewalls, inspect compromised processes, and preserve system secrets.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-green-500/30 flex items-center justify-between text-xs font-bold text-green-300 group-hover:text-white">
              <span className="tracking-wider">INITIALIZE NODE</span>
              <span className="group-hover:translate-x-1.5 transition-transform duration-200">&gt;&gt;</span>
            </div>
          </Link>

          {/* Card 3: Breach (Bridge) */}
          <Link
            to="/bridge-login"
            className="group relative flex flex-col justify-between p-6 rounded-lg bg-gray-900/80 border border-red-500/40 hover:border-red-400 transition-all duration-300 hover:shadow-[0_0_30px_rgba(239,68,68,0.35)] hover:-translate-y-1 backdrop-blur-md overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 rounded-full blur-2xl group-hover:bg-red-500/20 transition-all" />
            
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded border border-red-500/50 bg-red-950/30 flex items-center justify-center text-red-400 group-hover:text-red-300 group-hover:scale-105 transition-all shadow-[0_0_12px_rgba(239,68,68,0.25)]">
                  {/* Skull / Breach Zap Icon */}
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <span className="text-[10px] font-mono tracking-widest text-red-400 uppercase border border-red-500/30 px-2 py-0.5 rounded bg-red-950/40 font-semibold">
                  OFFENSIVE
                </span>
              </div>

              <h2 className="text-xl font-bold tracking-wider text-red-400 group-hover:text-red-300 transition-colors">
                BREACH (BRIDGE)
              </h2>
              <p className="mt-2 text-xs text-red-400/80 leading-relaxed font-mono">
                Initiate tactical penetration against the adversary. Bypass defensive perimeters through Layer 1 to Layer 5.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-red-500/30 flex items-center justify-between text-xs font-bold text-red-400 group-hover:text-red-200">
              <span className="tracking-wider">ENGAGE TARGET</span>
              <span className="group-hover:translate-x-1.5 transition-transform duration-200">&gt;&gt;</span>
            </div>
          </Link>
        </div>
      </main>

      {/* Cyber Footer */}
      <footer className="relative z-10 w-full border-t border-green-500/20 bg-gray-950/90 py-3 px-6 flex flex-col sm:flex-row items-center justify-between text-xs text-green-500/60 font-mono gap-2">
        <div className="flex items-center gap-2">
          <span>TRAZ_ENGINE://v1.0.0</span>
          <span className="text-green-500/40">|</span>
          <span className="text-green-400">STATUS: OPERATIONAL</span>
        </div>
        <div className="flex items-center gap-3">
          <span>&copy; 2026 TRAZ CTF</span>
          <span className="text-green-500/30">•</span>
          <span className="text-green-400 font-mono text-[11px]">Made by Taha</span>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
