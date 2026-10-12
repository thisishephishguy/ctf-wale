import React, { useState, useEffect, useRef } from 'react';
import supabase from '../../lib/supabase';

export default function FirewallApp({ teamId = 'team-alpha', isAttacker = false, attackerTeamId }) {
  const [firewallOn, setFirewallOn] = useState(true);
  const [lockedUntil, setLockedUntil] = useState(null);
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState('');
  const [logs, setLogs] = useState([
    { id: 1, time: '00:00:12', msg: 'Core firewall service daemon started', type: 'system' },
    { id: 2, time: '00:01:45', msg: 'Stateful packet inspection table initialized', type: 'info' },
    { id: 3, time: '00:02:30', msg: 'Rule #104: Block incoming unsolicited SYN packets', type: 'security' },
    { id: 4, time: '00:04:18', msg: 'Firewall status: ACTIVE - Filtering 10.0.0.0/16 subnet', type: 'success' }
  ]);
  const rowIdRef = useRef(null);

  // Helper to format ISO time to HH:MM:SS
  const formatTime = (date = new Date()) => {
    return date.toTimeString().split(' ')[0];
  };

  const addLog = (msg, type = 'info') => {
    setLogs((prev) => [
      { id: Date.now() + Math.random(), time: formatTime(), msg, type },
      ...prev.slice(0, 40)
    ]);
  };

  // Fetch initial state
  useEffect(() => {
    let isMounted = true;

    async function fetchTeamState() {
      try {
        setLoading(true);
        // Attempt query matching team_id or id
        let { data, error } = await supabase
          .from('team_state')
          .select('*')
          .eq('team_id', teamId)
          .maybeSingle();

        if (error || !data) {
          const fallback = await supabase
            .from('team_state')
            .select('*')
            .eq('id', teamId)
            .maybeSingle();
          if (fallback.data) {
            data = fallback.data;
          }
        }

        if (isMounted && data) {
          rowIdRef.current = data.id || data.team_id;
          const isOn = data.firewall_on !== false;
          setFirewallOn(isOn);
          setLockedUntil(data.firewall_locked_until || null);

          addLog(
            `Initial status synchronized: Firewall is ${isOn ? 'ONLINE (Enforcing)' : 'OFFLINE (Vulnerable)'}`,
            isOn ? 'success' : 'danger'
          );
        }
      } catch (err) {
        console.error('Failed to load firewall state:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    if (teamId) {
      fetchTeamState();
    }

    // Subscribe to realtime changes on team_state
    const channel = supabase
      .channel(`firewall-sync-${teamId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_state'
        },
        (payload) => {
          const record = payload.new;
          if (!record) return;
          if (record.team_id === teamId || record.id === teamId) {
            rowIdRef.current = record.id || record.team_id;
            const updatedOn = record.firewall_on !== false;
            setFirewallOn(updatedOn);
            setLockedUntil(record.firewall_locked_until || null);

            if (payload.eventType === 'UPDATE') {
              if (record.firewall_on === false) {
                addLog('CRITICAL: Firewall was DEACTIVATED by external payload!', 'danger');
              } else if (record.firewall_on === true) {
                addLog('DEFENSE: Firewall RE-ENGAGED and reinforced with 30s lockdown', 'success');
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [teamId]);

  // Handle countdown for lockedUntil
  useEffect(() => {
    if (!lockedUntil) {
      setSecondsRemaining(0);
      return;
    }

    const updateTimer = () => {
      const remainingMs = new Date(lockedUntil).getTime() - Date.now();
      const sec = Math.max(0, Math.ceil(remainingMs / 1000));
      setSecondsRemaining(sec);
      if (sec <= 0) {
        setActionError('');
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 500);
    return () => clearInterval(interval);
  }, [lockedUntil]);

  // Handle toggle click
  const handleToggle = async () => {
    setActionError('');

    // When isAttacker=false (defender view), the firewall is read-only
    if (!isAttacker) {
      return;
    }

    // Check if locked
    if (secondsRemaining > 0) {
      setActionError(`Firewall controls locked. Try again in ${secondsRemaining} seconds.`);
      return;
    }

    const nextState = !firewallOn;

    // Attacker toggles firewall
    try {
      setLoading(true);
      const updatePayload = {
        firewall_on: nextState
      };

      const filterCol = rowIdRef.current && rowIdRef.current !== teamId ? 'id' : 'team_id';
      const targetVal = rowIdRef.current || teamId;

      let { error: updateError } = await supabase
        .from('team_state')
        .update(updatePayload)
        .eq(filterCol, targetVal);

      if (updateError) {
        console.error('Error updating team_state firewall_on:', updateError);
        // Retry with id or team_id
        const altCol = filterCol === 'id' ? 'team_id' : 'id';
        const { error: retryError } = await supabase
          .from('team_state')
          .update(updatePayload)
          .eq(altCol, teamId);
        if (retryError) {
          console.error('Retry error updating team_state firewall_on:', retryError);
          throw retryError;
        }
      }

      setFirewallOn(nextState);
      if (!nextState) {
        addLog(`Firewall disabled at ${formatTime()} by ATTACKER`, 'danger');

        // Record Layer 2 (Network Firewall) progress for attacker
        try {
          const effAttackerId =
            (attackerTeamId && attackerTeamId !== 'team-alpha')
              ? attackerTeamId
              : sessionStorage.getItem('traz_attacker_team_id') ||
                sessionStorage.getItem('traz_team_id');

          if (effAttackerId && effAttackerId !== 'team-alpha') {
            let activeGameId = null;
            const { data: aTeam } = await supabase.from('teams').select('game_id').eq('id', effAttackerId).maybeSingle();
            activeGameId = aTeam?.game_id;
            if (!activeGameId && teamId) {
              const { data: tTeam } = await supabase.from('teams').select('game_id').eq('id', teamId).maybeSingle();
              activeGameId = tTeam?.game_id;
            }

            if (activeGameId) {
              let startedIso = new Date().toISOString();
              let durationSec = 1;

              const { data: existingRow } = await supabase
                .from('layer_progress')
                .select('started_at')
                .eq('game_id', activeGameId)
                .eq('attacker_team_id', effAttackerId)
                .eq('layer_number', 2)
                .maybeSingle();

              if (existingRow?.started_at) {
                startedIso = existingRow.started_at;
                durationSec = Math.max(1, Math.floor((Date.now() - new Date(existingRow.started_at).getTime()) / 1000));
              }

              const { error: lpErr } = await supabase.from('layer_progress').upsert({
                game_id: activeGameId,
                attacker_team_id: effAttackerId,
                layer_number: 2,
                started_at: startedIso,
                completed_at: new Date().toISOString(),
                duration_seconds: durationSec
              }, { onConflict: 'game_id,attacker_team_id,layer_number' });

              if (lpErr) {
                console.error('[FirewallApp] Layer 2 upsert error:', lpErr);
              } else {
                console.log('[FirewallApp] Layer 2 recorded in layer_progress with duration:', durationSec);
              }
            } else {
              console.error('[FirewallApp] activeGameId missing, cannot record Layer 2');
            }
          }
        } catch (lpErr) {
          console.error('[FirewallApp] Error recording Layer 2 progress:', lpErr);
        }

        // Dispatch defense alert row for defending team after a random 10-15 second delay
        const delayMs = Math.floor(Math.random() * 5000) + 10000; // 10-15s
        setTimeout(async () => {
          try {
            const now = new Date();
            const expiresAt = new Date(now.getTime() + 15000).toISOString();
            const { error: alertError } = await supabase.from('defense_alerts').insert([
              {
                team_id: teamId,
                alert_type: 'firewall',
                triggered_at: now.toISOString(),
                expires_at: expiresAt,
                responded: false
              }
            ]);
            if (alertError) {
              console.error('Failed to insert firewall defense alert:', alertError);
            }
          } catch (alertErr) {
            console.error('Exception inserting firewall defense alert:', alertErr);
          }
        }, delayMs);
      } else {
        addLog(`Firewall enabled at ${formatTime()} by ATTACKER`, 'success');
      }
    } catch (err) {
      console.error('Error toggling firewall:', err);
      setActionError(`Failed to update firewall status: ${err.message || 'Network error'}`);
    } finally {
      setLoading(false);
    }
  };

  const isLocked = secondsRemaining > 0;

  return (
    <div className="h-full flex flex-col bg-gray-950 text-gray-100 font-mono p-4 space-y-4 overflow-y-auto">
      {/* Top Banner: Status Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-lg bg-gray-900 border border-gray-800 shadow-lg gap-4">
        <div className="flex items-center space-x-4">
          {/* Shield Icon */}
          <div
            className={`w-14 h-14 rounded-xl flex items-center justify-center border-2 transition-all duration-300 shadow-md ${
              firewallOn
                ? 'bg-emerald-950/70 border-emerald-500 text-emerald-400 shadow-emerald-950/50'
                : 'bg-red-950/70 border-red-500 text-red-500 shadow-red-950/50 animate-pulse'
            }`}
          >
            {firewallOn ? (
              /* Green Shield Icon */
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            ) : (
              /* Red Shield (Broken / Disabled) Icon */
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <line x1="8" y1="9" x2="16" y2="15" />
                <line x1="16" y1="9" x2="8" y2="15" />
              </svg>
            )}
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs uppercase tracking-widest text-gray-400">Layer 1 Security</span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                  firewallOn ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}
              >
                {firewallOn ? 'ON // PROTECTED' : 'OFF // BREACHABLE'}
              </span>
            </div>
            <h1 className="text-xl font-bold tracking-wider text-white mt-0.5">
              TRAZ PERIMETER FIREWALL
            </h1>
            <p className="text-xs text-gray-400">
              Target ID: <span className="text-cyan-400">{teamId}</span> | Interface: <span className="text-emerald-400">eth0:WAN</span>
            </p>
          </div>
        </div>

        {/* Big Switch Controls */}
        <div className="flex flex-col items-end space-y-1">
          <div className="flex items-center space-x-3">
            <span className="text-xs uppercase font-semibold text-gray-300">
              {firewallOn ? 'FIREWALL ACTIVE' : 'FIREWALL OFFLINE'}
            </span>
            <button
              type="button"
              onClick={handleToggle}
              disabled={loading || isLocked || !isAttacker}
              title={!isAttacker ? 'Read-only on Defender Console' : isLocked ? `Locked for ${secondsRemaining}s` : 'Toggle Firewall'}
              className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-gray-950 ${
                isLocked || !isAttacker ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              } ${firewallOn ? 'bg-emerald-600' : 'bg-red-600'}`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition-transform duration-200 ease-in-out ${
                  firewallOn ? 'translate-x-9' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          <span className="text-[10px] text-gray-500">
            {isAttacker ? 'State Control' : 'Status Monitor'}
          </span>
        </div>
      </div>

      {/* Lockout Warning Banner if firewall_locked_until is active */}
      {isLocked && (
        <div className="p-3 bg-amber-950/80 border border-amber-500/60 rounded-lg flex items-center space-x-3 text-amber-200 animate-pulse">
          <svg className="w-5 h-5 flex-shrink-0 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <div className="text-xs flex-1">
            <span className="font-bold">LOCKOUT PROTOCOL ENGAGED:</span> Firewall controls locked. Try again in{' '}
            <span className="font-extrabold text-amber-400 underline">{secondsRemaining} seconds</span>.
          </div>
        </div>
      )}

      {/* Action Error Banner */}
      {actionError && !isLocked && (
        <div className="p-3 bg-red-950/80 border border-red-500/60 rounded-lg text-xs text-red-300 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError('')} className="text-gray-400 hover:text-white text-xs">
            ✕
          </button>
        </div>
      )}

      {/* Dashboard Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 bg-gray-900/80 border border-gray-800 rounded-lg">
          <div className="text-[10px] uppercase tracking-wider text-gray-400">Inspection Mode</div>
          <div className="text-base font-bold text-cyan-400 mt-1">STATEFUL_SPI</div>
          <div className="text-[10px] text-gray-500 mt-0.5">Kernel Netfilter v6</div>
        </div>

        <div className="p-3 bg-gray-900/80 border border-gray-800 rounded-lg">
          <div className="text-[10px] uppercase tracking-wider text-gray-400">Packets Dropped</div>
          <div className="text-base font-bold text-emerald-400 mt-1">
            {firewallOn ? '1,429 pkts/m' : '0 pkts/m'}
          </div>
          <div className="text-[10px] text-gray-500 mt-0.5">SYN Flood Guard</div>
        </div>

        <div className="p-3 bg-gray-900/80 border border-gray-800 rounded-lg">
          <div className="text-[10px] uppercase tracking-wider text-gray-400">Defense Reinforce</div>
          <div className="text-base font-bold text-amber-400 mt-1">
            {isLocked ? 'ACTIVE LOCK' : 'READY'}
          </div>
          <div className="text-[10px] text-gray-500 mt-0.5">Cooldown: {secondsRemaining}s</div>
        </div>

        <div className="p-3 bg-gray-900/80 border border-gray-800 rounded-lg">
          <div className="text-[10px] uppercase tracking-wider text-gray-400">Perimeter Status</div>
          <div className={`text-base font-bold mt-1 ${firewallOn ? 'text-emerald-400' : 'text-red-400'}`}>
            {firewallOn ? 'SHIELDED' : 'EXPOSED'}
          </div>
          <div className="text-[10px] text-gray-500 mt-0.5">Subnet 10.0.0.0/16</div>
        </div>
      </div>

      {/* Logs Window */}
      <div className="flex-1 flex flex-col bg-gray-900/90 border border-gray-800 rounded-lg p-3 min-h-[200px]">
        <div className="flex items-center justify-between pb-2 border-b border-gray-800 text-xs">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="font-bold text-gray-300 uppercase tracking-wider">Firewall Activity Stream</span>
          </div>
          <span className="text-[10px] text-gray-500 font-mono">SYS_JOURNALD</span>
        </div>

        <div className="flex-1 overflow-y-auto mt-2 space-y-1.5 pr-1 text-xs font-mono">
          {logs.map((log) => {
            let color = 'text-gray-300';
            if (log.type === 'danger') color = 'text-red-400 font-semibold';
            else if (log.type === 'success') color = 'text-emerald-400 font-semibold';
            else if (log.type === 'security') color = 'text-amber-400';
            else if (log.type === 'system') color = 'text-cyan-400';

            return (
              <div key={log.id} className="flex items-start space-x-2 py-0.5 hover:bg-black/30 rounded px-1 transition-colors">
                <span className="text-gray-500 text-[11px] select-none font-mono">[{log.time}]</span>
                <span className={color}>&gt; {log.msg}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
