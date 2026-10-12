import React, { useState, useEffect } from 'react';
import supabase from '../../lib/supabase';

export default function Toolkit({ targetTeamId = 'team-alpha' }) {
  const [targetState, setTargetState] = useState(null);
  const [crackerCooldownSeconds, setCrackerCooldownSeconds] = useState(0);

  // Fetch initial target team state and subscribe to changes
  useEffect(() => {
    let isMounted = true;

    async function fetchState() {
      try {
        let { data } = await supabase
          .from('team_state')
          .select('*')
          .or(`team_id.eq.${targetTeamId},id.eq.${targetTeamId}`)
          .maybeSingle();

        if (isMounted && data) {
          setTargetState(data);
        }
      } catch (err) {
        console.error('Failed to load target team_state in Toolkit:', err);
      }
    }

    if (targetTeamId) {
      fetchState();
    }

    const channel = supabase
      .channel(`toolkit-sync-${targetTeamId}`)
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
          if (rec && (rec.team_id === targetTeamId || rec.id === targetTeamId)) {
            setTargetState(rec);
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [targetTeamId]);

  // Interval timer for cracker_cooldown_until
  useEffect(() => {
    const checkCooldown = () => {
      if (!targetState?.cracker_cooldown_until) {
        setCrackerCooldownSeconds(0);
        return;
      }

      const diffMs = new Date(targetState.cracker_cooldown_until).getTime() - Date.now();
      const remaining = Math.max(0, Math.ceil(diffMs / 1000));
      setCrackerCooldownSeconds(remaining);
    };

    checkCooldown();
    const interval = setInterval(checkCooldown, 500);
    return () => clearInterval(interval);
  }, [targetState?.cracker_cooldown_until]);

  // Helper to inspect dropped files on target
  const droppedFiles = Array.isArray(targetState?.files_dropped) ? targetState.files_dropped : [];
  const hasFile = (term) => {
    return droppedFiles.some((f) => {
      if (typeof f === 'string') return f.toLowerCase().includes(term);
      const name = (f.name || f.filename || f.tool_type || '').toLowerCase();
      return name.includes(term);
    });
  };

  // Determine statuses
  const getCrackerStatus = () => {
    if (crackerCooldownSeconds > 0) {
      return { label: `Cooldown (${crackerCooldownSeconds}s)`, state: 'cooldown' };
    }
    if (targetState?.apps_locked === false || hasFile('cracker')) {
      return { label: 'Deployed', state: 'deployed' };
    }
    return { label: 'Ready', state: 'ready' };
  };

  const getMalwareStatus = () => {
    if (targetState?.devices_compromised || hasFile('malware')) {
      return { label: 'Deployed', state: 'deployed' };
    }
    return { label: 'Ready', state: 'ready' };
  };

  const getRansomwareStatus = () => {
    if (targetState?.database_locked || hasFile('ransomware')) {
      return { label: 'Deployed', state: 'deployed' };
    }
    return { label: 'Ready', state: 'ready' };
  };

  const crackerInfo = getCrackerStatus();
  const malwareInfo = getMalwareStatus();
  const ransomwareInfo = getRansomwareStatus();

  return (
    <div className="h-full flex flex-col bg-gray-950 text-gray-100 font-mono p-4 space-y-4 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-800">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-blue-950 border border-blue-500/50 flex items-center justify-center text-blue-400 shadow-md">
            {/* Toolkit Wrench / Cyber Arsenal Icon */}
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-wider text-white">
              CYBER ATTACK TOOLKIT
            </h1>
            <p className="text-xs text-gray-400">
              Offensive Weaponry Manifest | Target Node: <span className="text-cyan-400">{targetTeamId}</span>
            </p>
          </div>
        </div>

        <span className="text-[10px] bg-blue-500/10 border border-blue-500/30 text-blue-400 px-2.5 py-1 rounded uppercase tracking-wider font-bold">
          TRANSMITTER INTEGRATED
        </span>
      </div>

      {/* Info notice explaining transmitter usage */}
      <div className="p-3 bg-gray-900/80 border border-gray-800 rounded-lg text-xs text-gray-400 flex items-center space-x-2">
        <svg className="w-4 h-4 text-cyan-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        <span>
          This console monitors tool deployment status and cooldowns. To transmit a binary payload to the target host filesystem, use the <strong className="text-cyan-300">Transmitter</strong> application.
        </span>
      </div>

      {/* Three Tool Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
        {/* Card 1: Cracker (Blue Theme) */}
        <div className="flex flex-col justify-between p-4 rounded-xl bg-gradient-to-b from-blue-950/30 to-gray-900/80 border border-blue-500/40 shadow-lg shadow-blue-950/30 transition-all hover:border-blue-400">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-xl bg-blue-950 border border-blue-500 flex items-center justify-center text-blue-400 shadow-md">
                {/* Lock Icon */}
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>

              {/* Status Badge */}
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
                  crackerInfo.state === 'cooldown'
                    ? 'bg-amber-950 text-amber-300 border-amber-600 animate-pulse'
                    : crackerInfo.state === 'deployed'
                    ? 'bg-blue-950 text-blue-300 border-blue-600'
                    : 'bg-emerald-950 text-emerald-300 border-emerald-600'
                }`}
              >
                {crackerInfo.label}
              </span>
            </div>

            <h2 className="text-lg font-bold text-white tracking-wide">Cracker</h2>
            <p className="text-xs text-blue-300/80 mt-1">Application bypass tool</p>

            <div className="mt-4 space-y-1.5 text-xs text-gray-400 border-t border-gray-800 pt-3">
              <div className="flex justify-between">
                <span>Target:</span>
                <span className="text-gray-200">Layer 2 (App Controls)</span>
              </div>
              <div className="flex justify-between">
                <span>Payload:</span>
                <span className="text-gray-200 font-mono">cracker.bin (1.4MB)</span>
              </div>
              <div className="flex justify-between">
                <span>Execution:</span>
                <span className="text-gray-200">CrackerRunner Console</span>
              </div>
            </div>
          </div>

          {crackerCooldownSeconds > 0 && (
            <div className="mt-4 p-2 bg-amber-950/50 border border-amber-500/40 rounded text-center text-xs text-amber-300 animate-pulse">
              Lockout active: <strong>{crackerCooldownSeconds}s</strong> remaining
            </div>
          )}
        </div>

        {/* Card 2: Malware (Orange Theme) */}
        <div className="flex flex-col justify-between p-4 rounded-xl bg-gradient-to-b from-orange-950/30 to-gray-900/80 border border-orange-500/40 shadow-lg shadow-orange-950/30 transition-all hover:border-orange-400">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-xl bg-orange-950 border border-orange-500 flex items-center justify-center text-orange-400 shadow-md">
                {/* Bug / Malware Icon */}
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect width="8" height="14" x="8" y="6" rx="4" />
                  <path d="m19 7-3 2" />
                  <path d="m5 7 3 2" />
                  <path d="m19 19-3-2" />
                  <path d="m5 19 3-2" />
                  <path d="M20 13h-4" />
                  <path d="M4 13h4" />
                  <path d="m10 4 1 2" />
                  <path d="m14 4-1 2" />
                </svg>
              </div>

              {/* Status Badge */}
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
                  malwareInfo.state === 'deployed'
                    ? 'bg-orange-950 text-orange-300 border-orange-600'
                    : 'bg-emerald-950 text-emerald-300 border-emerald-600'
                }`}
              >
                {malwareInfo.label}
              </span>
            </div>

            <h2 className="text-lg font-bold text-white tracking-wide">Malware</h2>
            <p className="text-xs text-orange-300/80 mt-1">Device compromise payload</p>

            <div className="mt-4 space-y-1.5 text-xs text-gray-400 border-t border-gray-800 pt-3">
              <div className="flex justify-between">
                <span>Target:</span>
                <span className="text-gray-200">Layer 4 (Endpoints)</span>
              </div>
              <div className="flex justify-between">
                <span>Payload:</span>
                <span className="text-gray-200 font-mono">malware.elf (3.8MB)</span>
              </div>
              <div className="flex justify-between">
                <span>Execution:</span>
                <span className="text-gray-200">ManageApp Systems Update</span>
              </div>
            </div>
          </div>

          <div className="mt-4 p-2 bg-gray-900/60 border border-gray-800 rounded text-center text-[11px] text-gray-400">
            Lateral movement tool for infecting all 10 domain workstations.
          </div>
        </div>

        {/* Card 3: Ransomware (Red Theme) */}
        <div className="flex flex-col justify-between p-4 rounded-xl bg-gradient-to-b from-red-950/30 to-gray-900/80 border border-red-500/40 shadow-lg shadow-red-950/30 transition-all hover:border-red-400">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-xl bg-red-950 border border-red-500 flex items-center justify-center text-red-400 shadow-md">
                {/* Skull Icon */}
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="9" cy="12" r="1" />
                  <circle cx="15" cy="12" r="1" />
                  <path d="M8 20v2h8v-2" />
                  <path d="M12.5 17l-.5-1-.5 1h1z" />
                  <path d="M16 20a2 2 0 0 0 1.56-3.25 8 8 0 1 0-11.12 0A2 2 0 0 0 8 20" />
                </svg>
              </div>

              {/* Status Badge */}
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
                  ransomwareInfo.state === 'deployed'
                    ? 'bg-red-950 text-red-300 border-red-600'
                    : 'bg-emerald-950 text-emerald-300 border-emerald-600'
                }`}
              >
                {ransomwareInfo.label}
              </span>
            </div>

            <h2 className="text-lg font-bold text-white tracking-wide">Ransomware</h2>
            <p className="text-xs text-red-300/80 mt-1">Database encryption tool</p>

            <div className="mt-4 space-y-1.5 text-xs text-gray-400 border-t border-gray-800 pt-3">
              <div className="flex justify-between">
                <span>Target:</span>
                <span className="text-gray-200">Layer 5 (Final Database)</span>
              </div>
              <div className="flex justify-between">
                <span>Payload:</span>
                <span className="text-gray-200 font-mono">ransomware.py (740KB)</span>
              </div>
              <div className="flex justify-between">
                <span>Execution:</span>
                <span className="text-gray-200">ManageApp Database Vault</span>
              </div>
            </div>
          </div>

          <div className="mt-4 p-2 bg-gray-900/60 border border-gray-800 rounded text-center text-[11px] text-gray-400">
            Encodes all database relations and secures final victory.
          </div>
        </div>
      </div>
    </div>
  );
}
