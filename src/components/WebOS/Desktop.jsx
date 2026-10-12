import React, { useState, useEffect } from 'react';
import Taskbar from './Taskbar';
import Window from './Window';
import Terminal from './Terminal';
import FileExplorer from './FileExplorer';
import Transmitter from './Transmitter';
import FirewallApp from './FirewallApp';
import DefenseConsole from './DefenseConsole';
import StegExtract from './StegExtract';
import ManageApp from './ManageApp';
import Toolkit from './Toolkit';
import CrackerRunner from './CrackerRunner';
import supabase from '../../lib/supabase';

export default function Desktop({
  teamId = 'team-alpha',
  isAttacker = false,
  opponentTeamId = 'team-bravo',
  systemUsername = '',
  teamData = null
}) {
  const [openWindows, setOpenWindows] = useState([]);
  const [nextZIndex, setNextZIndex] = useState(10);
  const [selectedIcon, setSelectedIcon] = useState(null);
  const [showSystemInfo, setShowSystemInfo] = useState(true);
  const [firewallOn, setFirewallOn] = useState(true);
  const [contextMenu, setContextMenu] = useState(null);
  const [appsLocked, setAppsLocked] = useState(true);

  // App definitions
  const ownApps = [
    {
      id: 'terminal',
      title: 'Terminal - bash',
      shortTitle: 'Terminal',
      icon: (
        <svg className="w-8 h-8 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <polyline points="6 9 10 12 6 15" />
          <line x1="12" y1="15" x2="18" y2="15" />
        </svg>
      ),
      width: 680,
      height: 440
    },
    {
      id: 'file_explorer',
      title: 'File Explorer',
      shortTitle: 'Files',
      icon: (
        <svg className="w-8 h-8 text-amber-400" viewBox="0 0 24 24" fill="currentColor">
          <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
        </svg>
      ),
      width: 720,
      height: 480
    },
    {
      id: 'firewall',
      title: 'Perimeter Firewall',
      shortTitle: 'Firewall',
      icon: (
        <svg className="w-8 h-8 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <polyline points="9 12 11 14 15 10" />
        </svg>
      ),
      width: 580,
      height: 400
    },
    {
      id: 'defense_console',
      title: 'Defense Console',
      shortTitle: 'Defense',
      icon: (
        <svg className="w-8 h-8 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
          <path d="M7 10l3 3 7-7" />
        </svg>
      ),
      width: 640,
      height: 420
    },
    {
      id: 'manage',
      title: 'System Management',
      shortTitle: 'Manage',
      icon: (
        <svg className="w-8 h-8 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      ),
      width: 560,
      height: 380
    },
    {
      id: 'transmitter',
      title: 'Payload Transmitter',
      shortTitle: 'Transmitter',
      icon: (
        <svg className="w-8 h-8 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 11a9 9 0 0 1 9 9" />
          <path d="M4 4a16 16 0 0 1 16 16" />
          <circle cx="5" cy="19" r="1" fill="currentColor" />
          <line x1="12" y1="2" x2="8" y2="6" />
          <line x1="8" y1="2" x2="12" y2="6" />
        </svg>
      ),
      width: 700,
      height: 520
    },
    {
      id: 'toolkit',
      title: 'Security Toolkit',
      shortTitle: 'Toolkit',
      icon: (
        <svg className="w-8 h-8 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
      ),
      width: 600,
      height: 400
    },
    {
      id: 'steg_extract',
      title: 'Steg Extract Forensics',
      shortTitle: 'StegExtract',
      icon: (
        <svg className="w-8 h-8 text-teal-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
          <path d="M11 8v6M8 11h6" />
        </svg>
      ),
      width: 760,
      height: 520
    }
  ];

  const attackerApps = [
    {
      id: 'terminal',
      title: 'Terminal - bash',
      shortTitle: 'Terminal',
      icon: (
        <svg className="w-8 h-8 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <polyline points="6 9 10 12 6 15" />
          <line x1="12" y1="15" x2="18" y2="15" />
        </svg>
      ),
      width: 680,
      height: 440
    },
    {
      id: 'target_explorer',
      title: `Target Storage [${opponentTeamId}]`,
      shortTitle: 'Target Files',
      icon: (
        <svg className="w-8 h-8 text-amber-500" viewBox="0 0 24 24" fill="currentColor">
          <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
        </svg>
      ),
      width: 720,
      height: 480
    },
    {
      id: 'target_firewall',
      title: `Target Firewall [${opponentTeamId}]`,
      shortTitle: 'Target FW',
      icon: (
        <svg className="w-8 h-8 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <line x1="8" y1="9" x2="16" y2="15" />
          <line x1="16" y1="9" x2="8" y2="15" />
        </svg>
      ),
      width: 580,
      height: 400
    },
    {
      id: 'steg_extract',
      title: 'Steg Extract Forensics',
      shortTitle: 'StegExtract',
      icon: (
        <svg className="w-8 h-8 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
          <path d="M11 8v6M8 11h6" />
        </svg>
      ),
      width: 760,
      height: 520
    },
    {
      id: 'manage',
      title: 'Target Endpoint Management',
      shortTitle: 'Manage',
      icon: (
        <svg className="w-8 h-8 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      ),
      width: 820,
      height: 540
    }
  ];

  const appList = isAttacker ? attackerApps : ownApps;

  // Sync firewall state for defense node
  useEffect(() => {
    async function loadFirewall() {
      const activeId = isAttacker ? opponentTeamId : teamId;
      if (!activeId) return;
      try {
        const { data } = await supabase
          .from('team_state')
          .select('firewall_on')
          .eq('team_id', activeId)
          .maybeSingle();

        if (data && typeof data.firewall_on === 'boolean') {
          setFirewallOn(data.firewall_on);
        }
      } catch (err) {
        console.error('Firewall fetch error:', err);
      }
    }
    loadFirewall();
  }, [teamId, opponentTeamId, isAttacker]);

  // Subscribe to team_state for apps_locked in attack view
  useEffect(() => {
    if (!isAttacker || !opponentTeamId) return;

    let isMounted = true;

    async function fetchAppsLock() {
      try {
        let { data } = await supabase
          .from('team_state')
          .select('apps_locked')
          .eq('team_id', opponentTeamId)
          .maybeSingle();

        if (!data) {
          const fallback = await supabase
            .from('team_state')
            .select('apps_locked')
            .eq('id', opponentTeamId)
            .maybeSingle();
          data = fallback.data;
        }

        if (isMounted && data && typeof data.apps_locked === 'boolean') {
          setAppsLocked(data.apps_locked);
        }
      } catch (err) {
        console.error('Failed to load apps_locked state:', err);
      }
    }

    fetchAppsLock();

    const channel = supabase
      .channel(`team-state-lock-${opponentTeamId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_state'
        },
        (payload) => {
          if (!isMounted) return;
          const rec = payload.new;
          if (rec && (rec.team_id === opponentTeamId || rec.id === opponentTeamId)) {
            if (typeof rec.apps_locked === 'boolean') {
              setAppsLocked(rec.apps_locked);
            }
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [isAttacker, opponentTeamId]);

  // Window Management
  const openApp = (appId) => {
    if (isAttacker && appsLocked && appId !== 'terminal' && appId !== 'target_explorer' && appId !== 'target_firewall') {
      return;
    }

    const appConfig = appList.find((a) => a.id === appId) || {
      id: appId,
      title: appId.toUpperCase(),
      width: 600,
      height: 400
    };

    setOpenWindows((prev) => {
      const existing = prev.find((w) => w.appId === appId);
      if (existing) {
        // Bring to front and un-minimize
        return prev.map((w) =>
          w.id === existing.id
            ? { ...w, minimized: false, zIndex: nextZIndex }
            : w
        );
      }

      return [
        ...prev,
        {
          id: `win-${appId}-${Date.now()}`,
          appId: appConfig.id,
          title: appConfig.title,
          width: appConfig.width || 640,
          height: appConfig.height || 420,
          minimized: false,
          zIndex: nextZIndex
        }
      ];
    });

    setNextZIndex((z) => z + 1);
  };

  const closeWindow = (id) => {
    setOpenWindows((prev) => prev.filter((w) => w.id !== id));
  };

  const minimizeWindow = (id) => {
    setOpenWindows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, minimized: true } : w))
    );
  };

  const focusWindow = (id) => {
    setOpenWindows((prev) =>
      prev.map((w) =>
        w.id === id ? { ...w, minimized: false, zIndex: nextZIndex } : w
      )
    );
    setNextZIndex((z) => z + 1);
  };

  const handleTaskbarClick = (id) => {
    const targetWin = openWindows.find((w) => w.id === id);
    if (!targetWin) return;
    if (targetWin.minimized) {
      focusWindow(id);
    } else {
      // Toggle minimize if already focused at top
      const isTop = targetWin.zIndex === nextZIndex - 1;
      if (isTop) {
        minimizeWindow(id);
      } else {
        focusWindow(id);
      }
    }
  };

  // Desktop right-click context menu handler
  const handleContextMenu = (e) => {
    // Only trigger when right-clicking on desktop background or desktop icons container
    if (e.target.closest('.window-content') || e.target.closest('.window-control-btn')) return;
    e.preventDefault();
    const x = Math.min(e.clientX, window.innerWidth - 210);
    const y = Math.min(e.clientY, window.innerHeight - 200);
    setContextMenu({ x, y });
  };

  // Render Window Content
  const renderWindowContent = (win) => {
    switch (win.appId) {
      case 'terminal':
        return (
          <Terminal
            teamId={isAttacker ? opponentTeamId : teamId}
            isAttacker={isAttacker}
          />
        );

      case 'file_explorer':
      case 'target_explorer':
        return (
          <FileExplorer
            teamId={isAttacker ? opponentTeamId : teamId}
            isAttacker={isAttacker}
            attackerTeamId={teamId}
          />
        );

      case 'transmitter':
        return (
          <Transmitter
            attackerTeamId={teamId}
            targetTeamId={opponentTeamId}
          />
        );

      case 'firewall':
      case 'target_firewall':
        return (
          <FirewallApp
            teamId={isAttacker ? opponentTeamId : teamId}
            isAttacker={isAttacker}
            attackerTeamId={teamId}
          />
        );

      case 'defense_console':
        return (
          <DefenseConsole
            teamId={teamId}
          />
        );

      case 'toolkit':
        return (
          <Toolkit
            targetTeamId={opponentTeamId}
          />
        );

      case 'manage':
        return (
          <ManageApp
            teamId={isAttacker ? opponentTeamId : teamId}
            attackerTeamId={teamId}
            attackerPassword={teamData?.system_password || 'TRAZ_ROOT_PASS'}
          />
        );

      case 'steg_extract':
        return (
          <StegExtract
            targetTeamId={opponentTeamId}
            attackerTeamId={teamId}
          />
        );

      case 'cracker_runner':
        return (
          <CrackerRunner
            teamId={opponentTeamId}
            attackerTeamId={teamId}
          />
        );

      default:
        return (
          <div className="h-full w-full bg-slate-950 p-6 font-mono text-gray-300 text-xs">
            <div className="text-cyan-400 font-bold mb-2">APPLICATION: {win.title}</div>
            <p className="text-gray-400">System modules initialized and connected to TRAZ Layer 2 fabric.</p>
          </div>
        );
    }
  };

  return (
    <div
      onClick={() => {
        setSelectedIcon(null);
        setContextMenu(null);
      }}
      onContextMenu={handleContextMenu}
      className="relative w-full h-screen overflow-hidden select-none flex flex-col bg-[#050b18]"
      style={{
        background: isAttacker
          ? `radial-gradient(circle at 50% 30%, rgba(220, 38, 38, 0.25) 0%, transparent 60%),
             radial-gradient(circle at 65% 55%, rgba(185, 28, 28, 0.2) 0%, transparent 50%),
             radial-gradient(circle at 35% 55%, rgba(127, 29, 29, 0.3) 0%, transparent 50%),
             linear-gradient(135deg, #0b0204 0%, #17070a 45%, #050102 100%)`
          : `radial-gradient(circle at 50% 35%, rgba(0, 110, 255, 0.3) 0%, transparent 60%),
             radial-gradient(circle at 70% 50%, rgba(56, 189, 248, 0.22) 0%, transparent 50%),
             radial-gradient(circle at 30% 60%, rgba(99, 102, 241, 0.2) 0%, transparent 50%),
             linear-gradient(135deg, #040914 0%, #081730 45%, #030a17 100%)`
      }}
    >
      {/* Windows 11 Aurora / Light Bloom Elements */}
      <div
        className={`absolute top-1/4 left-1/3 w-[520px] h-[520px] rounded-full blur-[130px] pointer-events-none ${
          isAttacker ? 'bg-red-600/15' : 'bg-blue-600/20'
        }`}
      />
      <div
        className={`absolute top-1/3 right-1/4 w-[420px] h-[420px] rounded-full blur-[110px] pointer-events-none ${
          isAttacker ? 'bg-rose-500/15' : 'bg-cyan-400/15'
        }`}
      />
      <div
        className={`absolute bottom-1/4 left-1/2 -translate-x-1/2 w-[620px] h-[320px] rounded-full blur-[140px] pointer-events-none ${
          isAttacker ? 'bg-orange-700/10' : 'bg-indigo-600/15'
        }`}
      />

      {/* System info display showing username/password on first login */}
      {showSystemInfo && !isAttacker && (
        <div className="absolute top-6 right-6 z-10 w-72 bg-slate-900/90 border border-sky-500/40 rounded-xl p-3 shadow-2xl backdrop-blur-xl font-mono text-xs text-gray-300 transition-all">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-sky-900/60">
            <div className="flex items-center space-x-1.5 text-sky-400 font-bold tracking-wider">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
              <span>SYSTEM CREDENTIALS</span>
            </div>
            <button
              type="button"
              onClick={() => setShowSystemInfo(false)}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          <div className="space-y-1.5 text-[11px]">
            <div className="flex justify-between">
              <span className="text-gray-500">IDENTITY:</span>
              <span className="text-sky-200 font-bold">{teamId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">USERNAME:</span>
              <span className="text-emerald-400 font-bold">{systemUsername || teamData?.system_username || 'operative'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">PASSWORD:</span>
              <span className="text-amber-400 font-bold">{teamData?.system_password || 'Loading...'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">SECURITY:</span>
              <span className="text-blue-400">LAYER 2 ACTIVE</span>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Icons Grid: Left-Aligned Windows Style */}
      <div className="flex-1 p-3 flex flex-col flex-wrap content-start items-start gap-1 z-10 max-h-[calc(100vh-48px)]">
        {appList.map((app) => {
          const isSelected = selectedIcon === app.id;
          const isLocked = isAttacker && appsLocked && app.id !== 'terminal' && app.id !== 'target_explorer' && app.id !== 'target_firewall';

          return (
            <div
              key={app.id}
              title={isLocked ? 'Locked' : app.title}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedIcon(app.id);
                setContextMenu(null);
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                if (isLocked) return;
                openApp(app.id);
              }}
              className={`w-[84px] h-[90px] flex flex-col items-center justify-center p-1.5 rounded-md cursor-pointer transition-colors border select-none group relative ${
                isLocked ? 'opacity-40 cursor-not-allowed' : ''
              } ${
                isSelected
                  ? isAttacker
                    ? 'bg-red-500/25 border-red-400/60 shadow-sm'
                    : 'bg-sky-500/25 border-sky-400/60 shadow-sm'
                  : 'border-transparent hover:bg-white/10 hover:border-white/15'
              }`}
            >
              <div className="mb-1.5 relative drop-shadow-lg group-hover:scale-105 transition-transform">
                {app.icon}
                {isLocked && (
                  <span
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600/90 border border-red-400 flex items-center justify-center text-[9px] shadow-sm pointer-events-none"
                    title="Locked"
                  >
                    🔒
                  </span>
                )}
              </div>
              <span
                className={`text-[11px] font-sans font-normal text-center leading-tight truncate w-full px-1 py-0.5 rounded drop-shadow ${
                  isSelected
                    ? isAttacker
                      ? 'bg-red-600/80 text-white font-medium'
                      : 'bg-sky-600/80 text-white font-medium'
                    : 'text-gray-100 group-hover:text-white'
                }`}
              >
                {app.shortTitle}
              </span>
            </div>
          );
        })}
      </div>

      {/* Windows Right-Click Context Menu */}
      {contextMenu && (
        <div
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          onClick={(e) => e.stopPropagation()}
          className="absolute z-50 w-52 rounded-xl bg-slate-900/90 backdrop-blur-2xl border border-white/10 shadow-2xl p-1.5 text-xs text-gray-200 animate-in fade-in duration-150 font-sans"
        >
          <button
            type="button"
            onClick={() => {
              setSelectedIcon(null);
              setContextMenu(null);
            }}
            className="w-full flex items-center space-x-2.5 px-3 py-1.5 rounded-lg hover:bg-white/10 text-left transition-colors cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 4v6h-6" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setShowSystemInfo(true);
              setContextMenu(null);
            }}
            className="w-full flex items-center space-x-2.5 px-3 py-1.5 rounded-lg hover:bg-white/10 text-left transition-colors cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
            <span>Display Settings</span>
          </button>

          <div className="my-1 border-t border-white/10" />

          <button
            type="button"
            onClick={() => {
              openApp('file_explorer');
              setContextMenu(null);
            }}
            className="w-full flex items-center space-x-2.5 px-3 py-1.5 rounded-lg hover:bg-white/10 text-left transition-colors cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 text-amber-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
            </svg>
            <span>New Folder</span>
          </button>

          <div className="my-1 border-t border-white/10" />

          <button
            type="button"
            onClick={() => {
              setShowSystemInfo(true);
              setContextMenu(null);
            }}
            className="w-full flex items-center space-x-2.5 px-3 py-1.5 rounded-lg hover:bg-white/10 text-left transition-colors cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <span>Properties</span>
          </button>
        </div>
      )}

      {/* Render Open Windows */}
      {openWindows.map((win) => {
        if (win.minimized) return null;
        return (
          <Window
            key={win.id}
            id={win.id}
            title={win.title}
            width={win.width}
            height={win.height}
            zIndex={win.zIndex}
            isAttack={isAttacker}
            onClose={() => closeWindow(win.id)}
            onMinimize={() => minimizeWindow(win.id)}
            onFocus={() => focusWindow(win.id)}
          >
            {renderWindowContent(win)}
          </Window>
        );
      })}

      {/* Corner Watermark */}
      <div className="absolute bottom-13 right-3 z-10 pointer-events-none text-[10px] text-white/25 font-mono tracking-widest select-none">
        Made by Taha
      </div>

      {/* Bottom Windows 11 Taskbar */}
      <Taskbar
        openWindows={openWindows}
        onWindowClick={handleTaskbarClick}
        teamName={teamId}
        isAttacker={isAttacker}
        apps={appList}
        onOpenApp={openApp}
      />
    </div>
  );
}
