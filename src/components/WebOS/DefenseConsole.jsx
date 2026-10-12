import React, { useState, useEffect, useRef } from 'react';
import supabase from '../../lib/supabase';

export default function DefenseConsole({ teamId = 'team-alpha' }) {
  const [alerts, setAlerts] = useState([]);
  const [teamState, setTeamState] = useState({
    firewall_reinforce_used: false,
    apps_block_used: false,
    firewall_on: true,
    apps_locked: true
  });
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const expiredHandledRef = useRef(new Set());

  // Update tick every 200ms for smooth 15s countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 200);
    return () => clearInterval(timer);
  }, []);

  // Fetch initial state & alerts on mount
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setLoading(true);

        // 1. Fetch team_state
        const { data: stateData, error: stateErr } = await supabase
          .from('team_state')
          .select('*')
          .eq('team_id', teamId)
          .maybeSingle();

        if (stateErr) {
          console.error('Error fetching team_state:', stateErr);
        }

        if (stateData && isMounted) {
          setTeamState(stateData);
        }

        // 2. Fetch unresponded alerts
        const { data: unrespondedData, error: unrespondedErr } = await supabase
          .from('defense_alerts')
          .select('*')
          .eq('team_id', teamId)
          .eq('responded', false);

        if (unrespondedErr) {
          console.error('Error fetching unresponded defense alerts:', unrespondedErr);
        }

        // 3. Fetch alert history (responded alerts)
        const { data: historyData, error: historyErr } = await supabase
          .from('defense_alerts')
          .select('*')
          .eq('team_id', teamId)
          .eq('responded', true)
          .order('triggered_at', { ascending: false });

        if (historyErr) {
          console.error('Error fetching defense alerts history:', historyErr);
        }

        if (isMounted) {
          const combined = [
            ...(unrespondedData || []),
            ...(historyData || [])
          ];
          setAlerts(combined);
        }
      } catch (err) {
        console.error('Error initializing DefenseConsole:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    if (teamId) {
      loadData();
    }

    // Subscribe to defense_alerts table for INSERT and UPDATE filtered by team_id
    const alertsChannel = supabase
      .channel(`defense-alerts-${teamId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'defense_alerts',
          filter: `team_id=eq.${teamId}`
        },
        (payload) => {
          if (!isMounted || !payload.new) return;
          const newRecord = payload.new;
          setAlerts((prev) => [newRecord, ...prev.filter((a) => a.id !== newRecord.id)]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'defense_alerts',
          filter: `team_id=eq.${teamId}`
        },
        (payload) => {
          if (!isMounted || !payload.new) return;
          const updatedRecord = payload.new;
          setAlerts((prev) =>
            prev.map((a) => (a.id === updatedRecord.id ? updatedRecord : a))
          );
        }
      )
      .subscribe();

    // Subscribe to realtime team_state for countermeasure usage synchronization
    const stateChannel = supabase
      .channel(`defense-team-state-${teamId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_state'
        },
        (payload) => {
          if (!isMounted) return;
          const record = payload.new;
          if (record && (record.team_id === teamId || record.id === teamId)) {
            setTeamState((prev) => ({ ...prev, ...record }));
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(alertsChannel);
      supabase.removeChannel(stateChannel);
    };
  }, [teamId]);

  // Auto-mark expired firewall alerts when 15 seconds elapse without reinforce
  useEffect(() => {
    alerts.forEach((alert) => {
      const type = (alert.alert_type || alert.type || '').toLowerCase();
      if (type.includes('firewall')) {
        const isAlreadyResponded = alert.responded || alert.response_action;
        if (!isAlreadyResponded) {
          const triggerTime = new Date(alert.triggered_at || alert.created_at || Date.now()).getTime();
          const elapsedSec = (currentTime - triggerTime) / 1000;
          if (elapsedSec >= 15 && !expiredHandledRef.current.has(alert.id)) {
            expiredHandledRef.current.add(alert.id);
            handleExpireAlert(alert);
          }
        }
      }
    });
  }, [currentTime, alerts]);

  // Expire firewall alert
  const handleExpireAlert = async (alert) => {
    const nowIso = new Date().toISOString();
    const { error } = await supabase
      .from('defense_alerts')
      .update({
        responded: true,
        response_action: 'expired',
        responded_at: nowIso
      })
      .eq('id', alert.id);

    if (error) {
      console.error('Error marking defense alert expired:', error);
    }

    setAlerts((prev) =>
      prev.map((a) =>
        a.id === alert.id
          ? { ...a, responded: true, response_action: 'expired', responded_at: nowIso }
          : a
      )
    );
  };

  // REINFORCE Firewall Breach Handler
  const handleReinforceFirewall = async (alert) => {
    if (teamState.firewall_reinforce_used || actionInProgress) return;

    try {
      setActionInProgress(true);
      const nowIso = new Date().toISOString();
      const lockUntil = new Date(Date.now() + 30000).toISOString();

      // Update team_state: firewall_on=true, firewall_reinforce_used=true, firewall_locked_until=now+30s
      const { error: stateErr } = await supabase
        .from('team_state')
        .update({
          firewall_on: true,
          firewall_reinforce_used: true,
          firewall_locked_until: lockUntil
        })
        .eq('team_id', teamId);

      if (stateErr) {
        console.error('Error updating team_state on reinforce:', stateErr);
      }

      setTeamState((prev) => ({
        ...prev,
        firewall_on: true,
        firewall_reinforce_used: true,
        firewall_locked_until: lockUntil
      }));

      // Update defense_alerts: responded=true, response_action='reinforce', responded_at=now
      const { error: alertErr } = await supabase
        .from('defense_alerts')
        .update({
          responded: true,
          response_action: 'reinforce',
          responded_at: nowIso
        })
        .eq('id', alert.id);

      if (alertErr) {
        console.error('Error updating defense_alerts on reinforce:', alertErr);
      }

      setAlerts((prev) =>
        prev.map((a) =>
          a.id === alert.id
            ? { ...a, responded: true, response_action: 'reinforce', responded_at: nowIso }
            : a
        )
      );
    } catch (err) {
      console.error('Reinforce firewall exception:', err);
    } finally {
      setActionInProgress(false);
    }
  };

  // BLOCK Application Breach Handler
  const handleBlockAppBreach = async (alert) => {
    if (teamState.apps_block_used || actionInProgress) return;

    try {
      setActionInProgress(true);
      const nowIso = new Date().toISOString();
      const cooldownUntil = new Date(Date.now() + 30000).toISOString();

      // Update team_state: apps_locked=true, apps_block_used=true, cracker_cooldown_until=now+30s
      const { error: stateErr } = await supabase
        .from('team_state')
        .update({
          apps_locked: true,
          apps_block_used: true,
          cracker_cooldown_until: cooldownUntil
        })
        .eq('team_id', teamId);

      if (stateErr) {
        console.error('Error updating team_state on block:', stateErr);
      }

      setTeamState((prev) => ({
        ...prev,
        apps_locked: true,
        apps_block_used: true,
        cracker_cooldown_until: cooldownUntil
      }));

      // Update defense_alerts: responded=true, response_action='block', responded_at=now
      const { error: alertErr } = await supabase
        .from('defense_alerts')
        .update({
          responded: true,
          response_action: 'block',
          responded_at: nowIso
        })
        .eq('id', alert.id);

      if (alertErr) {
        console.error('Error updating defense_alerts on block:', alertErr);
      }

      setAlerts((prev) =>
        prev.map((a) =>
          a.id === alert.id
            ? { ...a, responded: true, response_action: 'block', responded_at: nowIso }
            : a
        )
      );
    } catch (err) {
      console.error('Block application breach exception:', err);
    } finally {
      setActionInProgress(false);
    }
  };

  // DISMISS Application Breach Handler
  const handleDismissAppBreach = async (alert) => {
    try {
      const nowIso = new Date().toISOString();

      // Update defense_alerts: responded=true, response_action='dismissed', responded_at=now
      const { error: alertErr } = await supabase
        .from('defense_alerts')
        .update({
          responded: true,
          response_action: 'dismissed',
          responded_at: nowIso
        })
        .eq('id', alert.id);

      if (alertErr) {
        console.error('Error updating defense_alerts on dismiss:', alertErr);
      }

      setAlerts((prev) =>
        prev.map((a) =>
          a.id === alert.id
            ? { ...a, responded: true, response_action: 'dismissed', responded_at: nowIso }
            : a
        )
      );
    } catch (err) {
      console.error('Dismiss application breach exception:', err);
    }
  };

  // Filter active alerts vs history
  const isAlertActive = (alert) => {
    if (alert.responded || alert.response_action) return false;
    const alertType = (alert.alert_type || alert.type || '').toLowerCase();

    if (alertType.includes('firewall')) {
      const triggerTime = new Date(alert.triggered_at || alert.created_at || Date.now()).getTime();
      const elapsedSec = (currentTime - triggerTime) / 1000;
      return elapsedSec < 15;
    }

    return true;
  };

  const activeAlerts = alerts.filter(isAlertActive);
  const historyAlerts = alerts.filter((a) => !isAlertActive(a));

  return (
    <div className="h-full flex flex-col bg-gray-950 text-gray-100 font-mono p-4 space-y-4 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-800">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-950 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shadow-md shadow-emerald-950/40">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <polyline points="9 11 12 14 22 4" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-wider text-white flex items-center space-x-2">
              <span>DEFENSE CONSOLE</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded uppercase">
                ACTIVE SENTINEL
              </span>
            </h1>
            <p className="text-xs text-gray-400">
              Tactical Threat Detection & Incident Response | Node: <span className="text-cyan-400">{teamId}</span>
            </p>
          </div>
        </div>

        {/* Counter badges */}
        <div className="flex items-center space-x-2 text-xs">
          <div className={`px-3 py-1 rounded flex items-center space-x-1.5 border ${
            activeAlerts.length > 0
              ? 'bg-red-950/80 border-red-500/50 text-red-300'
              : 'bg-emerald-950/60 border-emerald-600/40 text-emerald-300'
          }`}>
            <span className={`w-2 h-2 rounded-full ${activeAlerts.length > 0 ? 'bg-red-500 animate-ping' : 'bg-emerald-400'}`} />
            <span className="font-bold">{activeAlerts.length} ACTIVE THREAT{activeAlerts.length === 1 ? '' : 'S'}</span>
          </div>
        </div>
      </div>

      {/* Capabilities Status Banner */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="p-3 bg-gray-900 border border-gray-800 rounded-lg flex items-center justify-between">
          <div>
            <span className="text-gray-400 block text-[10px] uppercase">Firewall Reinforce Countermeasure</span>
            <span className={`font-bold ${teamState.firewall_reinforce_used ? 'text-gray-500' : 'text-emerald-400'}`}>
              {teamState.firewall_reinforce_used ? 'EXHAUSTED (Single-Use Spent)' : 'AVAILABLE (1 Charge)'}
            </span>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded border ${
            teamState.firewall_reinforce_used
              ? 'border-gray-700 bg-gray-800 text-gray-500'
              : 'border-emerald-500/40 bg-emerald-950/50 text-emerald-400'
          }`}>
            {teamState.firewall_reinforce_used ? '0/1' : '1/1'}
          </span>
        </div>

        <div className="p-3 bg-gray-900 border border-gray-800 rounded-lg flex items-center justify-between">
          <div>
            <span className="text-gray-400 block text-[10px] uppercase">App Lockdown Countermeasure</span>
            <span className={`font-bold ${teamState.apps_block_used ? 'text-gray-500' : 'text-cyan-400'}`}>
              {teamState.apps_block_used ? 'EXHAUSTED (Single-Use Spent)' : 'AVAILABLE (1 Charge)'}
            </span>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded border ${
            teamState.apps_block_used
              ? 'border-gray-700 bg-gray-800 text-gray-500'
              : 'border-cyan-500/40 bg-cyan-950/50 text-cyan-400'
          }`}>
            {teamState.apps_block_used ? '0/1' : '1/1'}
          </span>
        </div>
      </div>

      {/* Active Alerts Feed */}
      <div className="space-y-3">
        <div className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          <span>Active Threat Feed</span>
        </div>

        {activeAlerts.length === 0 ? (
          <div className="p-6 bg-gray-900/40 border border-gray-800 rounded-lg text-center">
            <svg className="w-10 h-10 text-emerald-500/40 mx-auto mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
            <div className="text-gray-400 font-semibold text-sm">NO ACTIVE INTRUSIONS DETECTED</div>
            <div className="text-gray-600 text-xs mt-1">Defensive telemetry is monitoring system events in real-time.</div>
          </div>
        ) : (
          <div className="space-y-3">
            {activeAlerts.map((alert) => {
              const alertType = (alert.alert_type || alert.type || '').toLowerCase();
              const isFirewall = alertType.includes('firewall');

              if (isFirewall) {
                // Countdown calculation for firewall breach
                const triggerTime = new Date(alert.triggered_at || alert.created_at || Date.now()).getTime();
                const elapsedSeconds = Math.max(0, (currentTime - triggerTime) / 1000);
                const remainingSeconds = Math.max(0, 15 - Math.floor(elapsedSeconds));
                const progressPct = Math.max(0, Math.min(100, ((15 - elapsedSeconds) / 15) * 100));

                return (
                  <div
                    key={alert.id}
                    className="p-4 rounded-xl border-2 relative overflow-hidden transition-all shadow-2xl bg-gradient-to-r from-red-950/90 via-red-900/80 to-red-950/90 border-red-500 shadow-[0_0_35px_rgba(239,68,68,0.7)]"
                  >
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center space-x-3">
                        <div className="text-3xl animate-bounce select-none">⚠️</div>
                        <div>
                          <h3 className="text-base sm:text-lg font-black text-red-200 tracking-wider flex items-center space-x-2">
                            <span>⚠ FIREWALL BREACH DETECTED</span>
                            <span className="text-[10px] bg-red-600 text-white font-black px-2 py-0.5 rounded uppercase shadow-sm">
                              CRITICAL
                            </span>
                          </h3>
                          <p className="text-xs text-red-200/90 mt-0.5">
                            Adversary disabled perimeter packet filter! Defenses dropping.
                          </p>
                        </div>
                      </div>

                      {/* Reinforce Button / Status */}
                      <div className="w-full sm:w-auto flex justify-end">
                        {teamState.firewall_reinforce_used ? (
                          <div className="text-xs bg-gray-900 border border-gray-700 text-gray-400 px-3 py-1.5 rounded-lg font-bold">
                            Reinforce already used
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleReinforceFirewall(alert)}
                            disabled={actionInProgress}
                            className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-500 hover:from-emerald-500 hover:to-green-500 text-white font-black text-xs rounded-lg shadow-xl shadow-emerald-950/80 border-2 border-emerald-400 transition-all active:scale-95 flex items-center justify-center space-x-2 cursor-pointer"
                          >
                            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                              <polyline points="9 11 12 14 22 4" />
                            </svg>
                            <span>REINFORCE ({remainingSeconds}s)</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* 15-second countdown timer bar */}
                    <div className="mt-3.5 pt-2 border-t border-red-800/60">
                      <div className="flex justify-between items-center text-[11px] text-red-200 font-mono mb-1.5">
                        <span className="font-bold tracking-wider">INTERVENTION WINDOW CLOSING:</span>
                        <span className="font-bold font-mono text-amber-300">{remainingSeconds}s remaining</span>
                      </div>
                      <div className="w-full bg-red-950/90 border border-red-700 rounded-full h-3 overflow-hidden p-0.5 shadow-inner">
                        <div
                          className="bg-gradient-to-r from-emerald-400 via-amber-400 to-red-500 h-full rounded-full transition-all duration-200 ease-linear"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              }

              // Application breach alert
              return (
                <div
                  key={alert.id}
                  className="p-4 bg-amber-950/40 border-2 border-amber-500 rounded-xl shadow-xl shadow-amber-950/50 relative"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center space-x-3">
                      <div className="text-3xl select-none">⚠️</div>
                      <div>
                        <h3 className="text-base sm:text-lg font-black text-amber-300 tracking-wider flex items-center space-x-2">
                          <span>⚠ APPLICATION BREACH DETECTED</span>
                          <span className="text-[10px] bg-amber-500 text-black font-black px-2 py-0.5 rounded uppercase">
                            LAYER 3 ATTACK
                          </span>
                        </h3>
                        <p className="text-xs text-amber-200/90 mt-0.5">
                          Unauthorized execution of cracker payload detected in memory space!
                        </p>
                      </div>
                    </div>

                    {/* Action buttons: BLOCK and DISMISS */}
                    <div className="flex items-center space-x-2.5 w-full sm:w-auto justify-end">
                      {!teamState.apps_block_used ? (
                        <button
                          type="button"
                          onClick={() => handleBlockAppBreach(alert)}
                          disabled={actionInProgress}
                          className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs rounded-lg shadow-lg shadow-cyan-950/60 border border-cyan-400 transition active:scale-95 flex items-center space-x-1.5 cursor-pointer"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                          </svg>
                          <span>BLOCK</span>
                        </button>
                      ) : (
                        <span className="text-xs bg-gray-900 border border-gray-700 text-gray-500 px-3 py-1.5 rounded-lg">
                          Block used
                        </span>
                      )}

                      {/* DISMISS Button */}
                      <button
                        type="button"
                        onClick={() => handleDismissAppBreach(alert)}
                        title="Dismiss alert"
                        className="px-3 py-2 rounded-lg bg-gray-900 hover:bg-gray-800 text-gray-300 hover:text-white border border-gray-700 transition text-xs font-bold cursor-pointer"
                      >
                        DISMISS
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Alert History Section at bottom */}
      <div className="flex-1 flex flex-col bg-gray-900/90 border border-gray-800 rounded-lg p-3 min-h-[160px]">
        <div className="flex items-center justify-between pb-2 border-b border-gray-800 text-xs">
          <span className="font-bold text-gray-300 uppercase tracking-wider">Alert Incident History</span>
          <span className="text-gray-500 text-[10px]">{historyAlerts.length} past incidents recorded</span>
        </div>

        <div className="flex-1 overflow-y-auto mt-2 space-y-2 pr-1 text-xs font-mono">
          {historyAlerts.length === 0 ? (
            <div className="text-gray-500 text-center py-4 text-xs italic">
              No historical security incidents archived yet.
            </div>
          ) : (
            historyAlerts.map((hist) => {
              const resStatus = hist.response_action || hist.response || hist.status || 'expired';
              let badgeColor = 'bg-gray-800 text-gray-400 border-gray-700';

              if (resStatus === 'reinforce') {
                badgeColor = 'bg-emerald-950 text-emerald-400 border-emerald-700';
              } else if (resStatus === 'block') {
                badgeColor = 'bg-cyan-950 text-cyan-400 border-cyan-700';
              } else if (resStatus === 'dismissed') {
                badgeColor = 'bg-gray-800 text-gray-400 border-gray-600';
              } else {
                badgeColor = 'bg-red-950/60 text-red-400 border-red-800';
              }

              const timeStr = hist.triggered_at || hist.created_at
                ? new Date(hist.triggered_at || hist.created_at).toLocaleTimeString()
                : '00:00:00';

              return (
                <div
                  key={hist.id}
                  className="flex items-center justify-between p-2 rounded bg-black/40 border border-gray-800/80"
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-500 text-[11px]">[{timeStr}]</span>
                    <span className="text-gray-300 font-semibold uppercase">
                      {hist.alert_type || 'Perimeter Alert'}
                    </span>
                    <span className="text-gray-500 text-[11px] truncate max-w-[200px]">
                      {hist.alert_type === 'firewall'
                        ? 'Firewall disabled breach event'
                        : 'Application restriction bypass event'}
                    </span>
                  </div>

                  <span className={`text-[10px] px-2 py-0.5 rounded border font-bold uppercase ${badgeColor}`}>
                    {resStatus}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
