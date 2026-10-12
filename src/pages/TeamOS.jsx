import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import supabase from '../lib/supabase';
import Desktop from '../components/WebOS/Desktop';
import AntiCheat from '../components/AntiCheat';

/**
 * TeamOS Page
 * The team's own system view. Shows WebOS desktop for the defender's own system.
 */
export default function TeamOS() {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Resolve teamId from params, query string, or sessionStorage
  const teamId =
    params.teamId ||
    searchParams.get('teamId') ||
    sessionStorage.getItem('traz_team_id') ||
    'team-alpha';

  const [teamData, setTeamData] = useState(null);
  const [teamState, setTeamState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showFirstLoginModal, setShowFirstLoginModal] = useState(false);
  const [showCredWidget, setShowCredWidget] = useState(false);
  const [recentAlert, setRecentAlert] = useState(null);
  const [copiedField, setCopiedField] = useState('');

  const handleForfeit = (forfeitTeamId, reason) => {
    alert(`SECURITY ALERT: Team ${forfeitTeamId || teamId} disqualified due to anti-cheat violation (${reason}). Match forfeited.`);
    navigate('/');
  };

  // 1. Fetch Team and Team State
  const fetchTeamDetails = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch team row
      const { data: team, error: teamErr } = await supabase
        .from('teams')
        .select('*')
        .eq('id', teamId)
        .maybeSingle();

      if (teamErr) {
        console.warn('[TeamOS] Error fetching team:', teamErr.message);
      }

      if (team) {
        setTeamData(team);
        // If first_login_done is false, show credentials modal
        if (team.first_login_done === false) {
          setShowFirstLoginModal(true);
        }
      } else {
        // Mock fallback for standalone testing or demo mode
        const fallbackTeam = {
          id: teamId,
          name: 'ALPHA DEFENSE NODE',
          system_username: 'operative_alpha',
          system_password: 'Phoenix742',
          first_login_done: false,
          opponent_id: 'team-bravo',
          game_id: null
        };
        setTeamData(fallbackTeam);
        setShowFirstLoginModal(true);
      }

      // Fetch team_state
      const { data: stateData, error: stateErr } = await supabase
        .from('team_state')
        .select('*')
        .eq('team_id', teamId)
        .maybeSingle();

      if (stateErr) {
        console.warn('[TeamOS] Error fetching team_state:', stateErr.message);
      }

      if (stateData) {
        setTeamState(stateData);
      }
    } catch (err) {
      console.error('[TeamOS] Initialization exception:', err);
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    fetchTeamDetails();
  }, [fetchTeamDetails]);

  // 2. Subscribe to real-time changes on team_state
  useEffect(() => {
    if (!teamId) return;

    const stateSubscription = supabase
      .channel(`team_state_channel_${teamId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_state',
          filter: `team_id=eq.${teamId}`
        },
        (payload) => {
          if (payload.new) {
            setTeamState(payload.new);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(stateSubscription);
    };
  }, [teamId]);

  // 3. Subscribe to real-time defense alerts
  useEffect(() => {
    if (!teamId) return;

    const alertSubscription = supabase
      .channel(`defense_alerts_channel_${teamId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'defense_alerts',
          filter: `team_id=eq.${teamId}`
        },
        (payload) => {
          if (payload.new) {
            setRecentAlert(payload.new);
            // Auto dismiss alert toast after 8 seconds
            setTimeout(() => {
              setRecentAlert((curr) => (curr?.id === payload.new.id ? null : curr));
            }, 8000);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(alertSubscription);
    };
  }, [teamId]);

  // Handle first login modal acknowledgment
  const handleAcknowledgeCredentials = async () => {
    try {
      if (teamData?.id) {
        await supabase
          .from('teams')
          .update({ first_login_done: true })
          .eq('id', teamData.id);
      }
    } catch (err) {
      console.warn('[TeamOS] Failed to update first_login_done:', err);
    }

    setTeamData((prev) => (prev ? { ...prev, first_login_done: true } : prev));
    setShowFirstLoginModal(false);
  };

  const copyToClipboard = (text, field) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(''), 2000);
    }
  };

  if (loading) {
    return (
      <div className="w-full h-screen bg-slate-950 flex flex-col items-center justify-center font-mono text-cyan-400">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-bold tracking-widest uppercase">
            ESTABLISHING SECURE CONNECTION TO DEFENSE NODE...
          </span>
        </div>
        <span className="text-xs text-gray-500">ID: {teamId}</span>
      </div>
    );
  }

  return (
    <AntiCheat
      teamId={teamId}
      gameId={teamData?.game_id}
      onForfeit={handleForfeit}
    >
      <div className="relative w-full h-screen overflow-hidden bg-slate-950 select-none">
        {/* Real-time Defense Alert Toast Banner */}
        {recentAlert && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 max-w-xl w-[90%] bg-red-950/95 border-2 border-red-500 shadow-[0_0_25px_rgba(239,68,68,0.7)] rounded-lg p-3 font-mono text-xs flex items-center justify-between animate-bounce">
            <div className="flex items-center space-x-3">
              <span className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
              <div>
                <div className="font-extrabold text-red-200 tracking-wider uppercase">
                  ⚠ INTRUSION ALERT: {recentAlert.alert_type?.toUpperCase()} VECTOR TRIGGERED!
                </div>
                <div className="text-[11px] text-red-300/80">
                  Opponent is targeting your perimeter. Open Defense Console to reinforce!
                </div>
              </div>
            </div>
            <button
              onClick={() => setRecentAlert(null)}
              className="text-red-400 hover:text-white px-2 py-1 rounded bg-black/40 text-xs"
            >
              DISMISS
            </button>
          </div>
        )}

        {/* FIRST LOGIN CREDENTIALS MODAL */}
        {showFirstLoginModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn">
            <div className="relative max-w-md w-full bg-slate-900 border-2 border-cyan-400 rounded-xl p-6 shadow-[0_0_40px_rgba(6,182,212,0.4)] font-mono text-gray-200">
              {/* Modal Header */}
              <div className="flex items-center space-x-2 border-b border-cyan-900/60 pb-3 mb-4">
                <svg className="w-6 h-6 text-cyan-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <h2 className="text-base sm:text-lg font-black tracking-widest text-cyan-300 uppercase">
                  SYSTEM CREDENTIALS GENERATED
                </h2>
              </div>

              {/* Warning Subheading */}
              <div className="p-3 bg-cyan-950/40 border border-cyan-600/40 rounded-lg mb-5 text-xs text-cyan-200/90 leading-relaxed">
                These are <strong className="text-white underline">YOUR</strong> system credentials. Memorize them! Your opponent will try to crack this password in Layer 1.
              </div>

              {/* Credential Details */}
              <div className="space-y-3 mb-6">
                {/* Username Field */}
                <div className="bg-black/70 border border-cyan-900/80 rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase tracking-widest block">
                      System Username
                    </span>
                    <span className="text-sm font-bold text-cyan-300 tracking-wider">
                      {teamData?.system_username || 'operative'}
                    </span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(teamData?.system_username || 'operative', 'user')}
                    className="px-2.5 py-1 text-[11px] bg-cyan-950 hover:bg-cyan-900 text-cyan-300 rounded border border-cyan-700/60 transition"
                    type="button"
                  >
                    {copiedField === 'user' ? 'COPIED!' : 'COPY'}
                  </button>
                </div>

                {/* Password Field */}
                <div className="bg-black/70 border border-amber-600/60 rounded-lg p-3 flex items-center justify-between shadow-[0_0_15px_rgba(245,158,11,0.15)]">
                  <div>
                    <span className="text-[10px] text-amber-400 uppercase tracking-widest block">
                      System Password (CRITICAL)
                    </span>
                    <span className="text-base font-extrabold text-amber-300 tracking-widest">
                      {teamData?.system_password || 'Phoenix742'}
                    </span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(teamData?.system_password || 'Phoenix742', 'pass')}
                    className="px-2.5 py-1 text-[11px] bg-amber-950 hover:bg-amber-900 text-amber-300 rounded border border-amber-600 transition"
                    type="button"
                  >
                    {copiedField === 'pass' ? 'COPIED!' : 'COPY'}
                  </button>
                </div>
              </div>

              {/* Acknowledge Action Button */}
              <button
                onClick={handleAcknowledgeCredentials}
                className="w-full py-3 bg-gradient-to-r from-cyan-600 to-teal-500 hover:from-cyan-500 hover:to-teal-400 text-black font-black text-xs uppercase tracking-widest rounded-lg shadow-lg shadow-cyan-950/60 transition active:scale-[0.98] cursor-pointer"
                type="button"
              >
                ACKNOWLEDGE & INITIALIZE OS
              </button>
            </div>
          </div>
        )}

        {/* Main WebOS Desktop in Defender Mode */}
        <Desktop
          teamId={teamId}
          isAttacker={false}
          opponentTeamId={teamData?.opponent_id || 'team-bravo'}
          systemUsername={teamData?.system_username}
          teamData={teamData}
        />

        {/* Permanent Floating 'MY CREDENTIALS' Widget (Own-system view only) */}
        <div className="fixed bottom-14 left-4 z-40 font-mono">
          {showCredWidget && (
            <div className="mb-2 w-72 bg-slate-900/95 border border-cyan-500/80 rounded-xl p-3.5 shadow-[0_0_25px_rgba(6,182,212,0.35)] backdrop-blur-xl text-xs text-gray-200 animate-fadeIn">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-cyan-900/60">
                <div className="flex items-center space-x-1.5 text-cyan-400 font-bold tracking-wider text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  <span>SYSTEM CREDENTIALS</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCredWidget(false)}
                  className="text-gray-400 hover:text-white text-xs px-1 hover:bg-white/10 rounded transition cursor-pointer"
                  title="Close"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-2 text-[11px]">
                {/* System Username */}
                <div className="bg-black/60 rounded p-2 border border-cyan-900/50 flex items-center justify-between">
                  <div>
                    <span className="text-[9px] text-gray-400 uppercase tracking-widest block">
                      Username
                    </span>
                    <span className="text-xs font-bold text-cyan-300 tracking-wider">
                      {teamData?.system_username || 'operative'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(teamData?.system_username || 'operative', 'widget_user')}
                    className="px-2 py-0.5 text-[10px] bg-cyan-950 hover:bg-cyan-900 text-cyan-300 rounded border border-cyan-700/60 transition cursor-pointer"
                  >
                    {copiedField === 'widget_user' ? 'COPIED!' : 'COPY'}
                  </button>
                </div>

                {/* System Password */}
                <div className="bg-black/60 rounded p-2 border border-amber-600/50 flex items-center justify-between shadow-[0_0_10px_rgba(245,158,11,0.1)]">
                  <div>
                    <span className="text-[9px] text-amber-400 uppercase tracking-widest block">
                      Password (CRITICAL)
                    </span>
                    <span className="text-xs font-black text-amber-300 tracking-widest">
                      {teamData?.system_password || 'Phoenix742'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(teamData?.system_password || 'Phoenix742', 'widget_pass')}
                    className="px-2 py-0.5 text-[10px] bg-amber-950 hover:bg-amber-900 text-amber-300 rounded border border-amber-600 transition cursor-pointer"
                  >
                    {copiedField === 'widget_pass' ? 'COPIED!' : 'COPY'}
                  </button>
                </div>
              </div>

              <div className="mt-2.5 pt-2 border-t border-cyan-950 text-[10px] text-cyan-400/70 text-center">
                Keep secure — Opponents target this in Layer 1
              </div>
            </div>
          )}

          {/* Floating Cyan Pill Button */}
          <button
            type="button"
            onClick={() => setShowCredWidget((prev) => !prev)}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-cyan-950/90 hover:bg-cyan-900 text-cyan-300 hover:text-cyan-100 border border-cyan-400/70 rounded-full shadow-[0_0_15px_rgba(6,182,212,0.3)] text-[11px] font-bold tracking-wider uppercase transition-all duration-200 active:scale-95 cursor-pointer backdrop-blur-md"
            title="Toggle system credentials display"
          >
            <svg className="w-3.5 h-3.5 text-cyan-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span>MY CREDENTIALS</span>
          </button>
        </div>
      </div>
    </AntiCheat>
  );
}
