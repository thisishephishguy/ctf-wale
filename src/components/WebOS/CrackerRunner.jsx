import React, { useState, useEffect, useRef } from 'react';
import supabase from '../../lib/supabase';

const HACK_LOGS = [
  'Initializing raw socket interface on eth0...',
  'Probing target PAM authentication stack...',
  'Injecting heap buffer bypass into libsecurity.so...',
  'Overwriting function pointer table @ 0x7ffd98b2...',
  'Nullifying ACL authorization checks...',
  'Evading kernel audit log daemon...',
  'Zeroing app privilege restriction descriptors...',
  'Executing post-exploitation payload...',
  'SUCCESS: Application security restrictions neutralized!'
];

export default function CrackerRunner({ teamId = 'team-alpha', attackerTeamId = 'team-bravo' }) {
  const [targetState, setTargetState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState([]);
  const [runSuccess, setRunSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const rowIdRef = useRef(null);
  const alertTimeoutRef = useRef(null);

  // Fetch target team state and subscribe
  useEffect(() => {
    let isMounted = true;

    async function fetchTarget() {
      try {
        setLoading(true);
        let { data } = await supabase
          .from('team_state')
          .select('*')
          .or(`team_id.eq.${teamId},id.eq.${teamId}`)
          .maybeSingle();

        if (isMounted && data) {
          rowIdRef.current = data.id || data.team_id;
          setTargetState(data);
          if (data.apps_locked === false) {
            setRunSuccess(true);
          }
        }
      } catch (err) {
        console.error('Failed to load target in CrackerRunner:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    if (teamId) {
      fetchTarget();
    }

    // Realtime subscription
    const channel = supabase
      .channel(`cracker-runner-${teamId}`)
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
          if (rec && (rec.team_id === teamId || rec.id === teamId)) {
            rowIdRef.current = rec.id || rec.team_id;
            setTargetState(rec);
            if (rec.apps_locked === false) {
              setRunSuccess(true);
            }
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
      if (alertTimeoutRef.current) {
        clearTimeout(alertTimeoutRef.current);
      }
    };
  }, [teamId]);

  // Handle countdown calculation for cracker_cooldown_until
  useEffect(() => {
    const updateCooldown = () => {
      if (!targetState?.cracker_cooldown_until) {
        setCooldownRemaining(0);
        return;
      }
      const diffMs = new Date(targetState.cracker_cooldown_until).getTime() - Date.now();
      const sec = Math.max(0, Math.ceil(diffMs / 1000));
      setCooldownRemaining(sec);
    };

    updateCooldown();
    const timer = setInterval(updateCooldown, 500);
    return () => clearInterval(timer);
  }, [targetState?.cracker_cooldown_until]);

  // Check if Cracker exists in files_dropped
  const droppedFiles = Array.isArray(targetState?.files_dropped) ? targetState.files_dropped : [];
  const hasCrackerFile = droppedFiles.some((f) => {
    if (typeof f === 'string') return f.toLowerCase().includes('cracker');
    const name = (f.name || f.filename || f.tool_type || '').toLowerCase();
    return name.includes('cracker');
  });

  // Run cracker execution
  const handleRunCracker = async () => {
    setErrorMsg('');

    // Check cooldown
    if (cooldownRemaining > 0) {
      setErrorMsg(`Cooldown active: ${cooldownRemaining}s remaining`);
      return;
    }

    if (!hasCrackerFile && targetState?.apps_locked !== false) {
      setErrorMsg('Cracker binary payload not found on target filesystem. Transmit cracker first!');
      return;
    }

    setIsRunning(true);
    setProgress(0);
    setLogs(['[*] Initiating zero-day cracker sequence...']);

    // 3-second multi-step animation with progress and code streaming
    const totalDuration = 3000;
    const intervalTime = 100;
    let elapsed = 0;

    const timer = setInterval(() => {
      elapsed += intervalTime;
      const currentProgress = Math.min(100, Math.floor((elapsed / totalDuration) * 100));
      setProgress(currentProgress);

      const logIndex = Math.floor((currentProgress / 100) * HACK_LOGS.length);
      if (logIndex < HACK_LOGS.length) {
        setLogs((prev) => {
          const nextLog = HACK_LOGS[logIndex];
          if (!prev.includes(nextLog)) {
            return [...prev, nextLog];
          }
          return prev;
        });
      }

      if (elapsed >= totalDuration) {
        clearInterval(timer);
        finishCrackerExecution();
      }
    }, intervalTime);
  };

  const finishCrackerExecution = async () => {
    setIsRunning(false);
    setProgress(100);

    try {
      // 1. Update target team_state.apps_locked = false
      const filterCol = rowIdRef.current && rowIdRef.current !== teamId ? 'id' : 'team_id';
      const targetVal = rowIdRef.current || teamId;

      let { error: updateError } = await supabase
        .from('team_state')
        .update({ apps_locked: false })
        .eq(filterCol, targetVal);

      if (updateError) {
        console.error('Error unlocking apps on target team_state:', updateError);
        const altCol = filterCol === 'id' ? 'team_id' : 'id';
        const { error: retryError } = await supabase
          .from('team_state')
          .update({ apps_locked: false })
          .eq(altCol, teamId);
        if (retryError) {
          console.error('Retry error unlocking apps on target team_state:', retryError);
          throw retryError;
        }
      }

      setRunSuccess(true);
      setTargetState((prev) => ({ ...prev, apps_locked: false }));

      // 2. Insert defense_alerts row for the defending team:
      // { team_id: targetTeamId, alert_type: 'application', triggered_at, responded: false } (no expires_at)
      const triggered_at = new Date().toISOString();
      const { error: alertError } = await supabase.from('defense_alerts').insert([
        {
          team_id: teamId,
          alert_type: 'application',
          triggered_at: triggered_at,
          responded: false
        }
      ]);

      if (alertError) {
        console.error('Failed to insert application defense alert:', alertError);
      }

      // 3. Record Layer 3 (Application Security) in layer_progress
      const effAttackerId =
        (attackerTeamId && attackerTeamId !== 'team-alpha' && attackerTeamId !== 'team-bravo')
          ? attackerTeamId
          : sessionStorage.getItem('traz_attacker_team_id') ||
            sessionStorage.getItem('traz_team_id');

      if (effAttackerId && effAttackerId !== 'team-alpha' && effAttackerId !== 'team-bravo') {
        let activeGameId = null;
        const { data: aInfo } = await supabase.from('teams').select('game_id').eq('id', effAttackerId).maybeSingle();
        activeGameId = aInfo?.game_id;
        if (!activeGameId && teamId) {
          const { data: tInfo } = await supabase.from('teams').select('game_id').eq('id', teamId).maybeSingle();
          activeGameId = tInfo?.game_id;
        }

        if (activeGameId) {
          let startedIso = new Date().toISOString();
          let durationSec = 1;

          const { data: existingRow } = await supabase
            .from('layer_progress')
            .select('started_at')
            .eq('game_id', activeGameId)
            .eq('attacker_team_id', effAttackerId)
            .eq('layer_number', 3)
            .maybeSingle();

          if (existingRow?.started_at) {
            startedIso = existingRow.started_at;
            durationSec = Math.max(1, Math.floor((Date.now() - new Date(existingRow.started_at).getTime()) / 1000));
          }

          const { error: lpErr } = await supabase.from('layer_progress').upsert({
            game_id: activeGameId,
            attacker_team_id: effAttackerId,
            layer_number: 3,
            started_at: startedIso,
            completed_at: new Date().toISOString(),
            duration_seconds: durationSec
          }, { onConflict: 'game_id,attacker_team_id,layer_number' });

          if (lpErr) {
            console.error('[CrackerRunner] Layer 3 upsert error:', lpErr);
          } else {
            console.log('[CrackerRunner] Layer 3 recorded in layer_progress with duration:', durationSec);
          }
        }
      }
    } catch (err) {
      console.error('Error completing cracker execution:', err);
      setErrorMsg(`Execution error: ${err.message || 'Network failure'}`);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-950 text-gray-100 font-mono p-4 space-y-4 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-800">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-blue-950 border border-blue-500/50 flex items-center justify-center text-blue-400 shadow-md">
            {/* Terminal / Code Icon */}
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="4 17 10 11 4 5" />
              <line x1="12" y1="19" x2="20" y2="19" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-wider text-white">
              CRACKER RUNNER // RUNTIME CONSOLE
            </h1>
            <p className="text-xs text-gray-400">
              Target Node: <span className="text-cyan-400">{teamId}</span> | Attacker: <span className="text-blue-400">{attackerTeamId}</span>
            </p>
          </div>
        </div>

        {/* State Indicator */}
        <span
          className={`text-xs px-2.5 py-1 rounded font-bold border uppercase tracking-wider ${
            targetState?.apps_locked === false
              ? 'bg-emerald-950 text-emerald-300 border-emerald-600'
              : 'bg-red-950 text-red-300 border-red-600'
          }`}
        >
          {targetState?.apps_locked === false ? 'APPS UNLOCKED' : 'APPS LOCKED'}
        </span>
      </div>

      {/* Target File Status Banner */}
      <div className="p-3 bg-gray-900 border border-gray-800 rounded-lg flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2">
          <span className="text-gray-400">Target Staging Status:</span>
          {hasCrackerFile ? (
            <span className="text-emerald-400 font-bold flex items-center space-x-1">
              <span>✓</span>
              <span>cracker.bin located in target file drop</span>
            </span>
          ) : (
            <span className="text-amber-400 font-bold flex items-center space-x-1">
              <span>⚠️</span>
              <span>No cracker binary staged (transmit first via Transmitter)</span>
            </span>
          )}
        </div>

        {cooldownRemaining > 0 && (
          <span className="text-amber-400 font-bold bg-amber-950/60 border border-amber-600/50 px-2 py-0.5 rounded">
            Cooldown active: {cooldownRemaining}s remaining
          </span>
        )}
      </div>

      {/* Error / Cooldown notice */}
      {errorMsg && (
        <div className="p-3 bg-red-950/80 border border-red-500/60 rounded text-xs text-red-300">
          {errorMsg}
        </div>
      )}

      {/* Run Cracker Trigger */}
      <div className="flex items-center space-x-4">
        <button
          type="button"
          onClick={handleRunCracker}
          disabled={isRunning || cooldownRemaining > 0 || loading}
          className={`px-6 py-3 rounded-lg font-bold text-sm tracking-wider uppercase border shadow-xl transition-all ${
            cooldownRemaining > 0 || isRunning
              ? 'bg-gray-800 text-gray-500 border-gray-700 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white border-blue-400 shadow-blue-950 cursor-pointer active:scale-95'
          }`}
        >
          {isRunning ? 'CRACKING APPLICATION LOCKS...' : 'RUN CRACKER'}
        </button>

        {cooldownRemaining > 0 && (
          <div className="text-xs text-amber-400 font-mono">
            Defense countermeasure engaged. Waiting for lock release: {cooldownRemaining}s
          </div>
        )}
      </div>

      {/* Progress Bar during execution */}
      {isRunning && (
        <div className="space-y-1.5 p-3 bg-gray-900/90 border border-blue-500/40 rounded-lg">
          <div className="flex justify-between text-xs text-cyan-300 font-bold">
            <span>INJECTING EXPLOIT MEMORY VECTORS</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-black rounded-full h-3 overflow-hidden border border-gray-700">
            <div
              className="bg-gradient-to-r from-blue-500 to-cyan-400 h-full transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Real-time Code Scrolling / Execution Output Console */}
      <div className="flex-1 flex flex-col bg-black/90 border border-gray-800 rounded-lg p-3 min-h-[200px]">
        <div className="flex items-center justify-between pb-2 border-b border-gray-800 text-xs">
          <span className="font-bold text-gray-300 uppercase tracking-wider flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <span>Execution Terminal Stream</span>
          </span>
          <span className="text-[10px] text-gray-500">STDOUT // TTY1</span>
        </div>

        <div className="flex-1 overflow-y-auto mt-2 space-y-1 text-xs font-mono">
          {logs.length === 0 ? (
            <div className="text-gray-600 italic py-4">
              [Awaiting operator trigger. Click 'RUN CRACKER' to execute bypass payload on target system]
            </div>
          ) : (
            logs.map((log, idx) => (
              <div key={idx} className="flex items-start space-x-2">
                <span className="text-blue-500 select-none">&gt;&gt;</span>
                <span className={idx === logs.length - 1 ? 'text-cyan-300 font-semibold' : 'text-gray-300'}>
                  {log}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Success Banner */}
      {runSuccess && !isRunning && (
        <div className="p-3 bg-emerald-950/70 border border-emerald-500 rounded-lg flex items-center justify-between text-xs text-emerald-300">
          <div className="flex items-center space-x-2">
            <span className="text-lg">✓</span>
            <div>
              <span className="font-bold">APPLICATION ACCESS GRANTED:</span>
              <span className="text-emerald-200/80 ml-1">
                Target applications have been unlocked! (Defensive alert dispatched with 10-15s stealth delay)
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
