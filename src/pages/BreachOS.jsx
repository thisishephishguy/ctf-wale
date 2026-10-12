import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import supabase from '../lib/supabase';
import { generateSingleCredentials } from '../lib/categories';
import PasswordBreach from './PasswordBreach';
import AntiCheat from '../components/AntiCheat';

// Import all WebOS components
import Desktop from '../components/WebOS/Desktop';
import Taskbar from '../components/WebOS/Taskbar';
import Window from '../components/WebOS/Window';
import Terminal from '../components/WebOS/Terminal';
import FileExplorer from '../components/WebOS/FileExplorer';
import Transmitter from '../components/WebOS/Transmitter';
import FirewallApp from '../components/WebOS/FirewallApp';
import DefenseConsole from '../components/WebOS/DefenseConsole';

/**
 * BreachOS Page
 * The ATTACKER's view of the opponent's system.
 * Orchestrates the full 5-Layer CTF Breach Flow.
 */
export default function BreachOS() {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const handleForfeit = (forfeitedId, reason) => {
    alert(`SECURITY ALERT: Team ${forfeitedId || attackerTeamId} disqualified due to anti-cheat violation (${reason}). Match forfeited.`);
    navigate('/');
  };

  // Resolve targetTeamId
  const targetTeamId =
    params.targetTeamId ||
    params.teamId ||
    searchParams.get('targetTeamId') ||
    searchParams.get('teamId') ||
    'team-bravo';

  // Resolve attackerTeamId (stored in sessionStorage, query params, or resolved from target opponent)
  const [attackerTeamId, setAttackerTeamId] = useState(() => {
    return (
      sessionStorage.getItem('traz_attacker_team_id') ||
      sessionStorage.getItem('traz_team_id') ||
      searchParams.get('attackerId') ||
      ''
    );
  });

  // State
  const [targetTeam, setTargetTeam] = useState(null);
  const [attackerTeam, setAttackerTeam] = useState(null);
  const [targetState, setTargetState] = useState(null);
  const [currentLayer, setCurrentLayer] = useState(1);
  const [loading, setLoading] = useState(true);
  const [layerProgressList, setLayerProgressList] = useState([]);
  const [layerStartTimes, setLayerStartTimes] = useState({});
  const [showLayerSuccessModal, setShowLayerSuccessModal] = useState(null);
  const [hudExpanded, setHudExpanded] = useState(true);

  // Prevent duplicate completion triggers
  const completedLayersRef = useRef(new Set());

  // 1. Fetch Target Team & Existing Layer Progress
  const initGameData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch Target Team
      const { data: tTeam, error: tErr } = await supabase
        .from('teams')
        .select('*')
        .eq('id', targetTeamId)
        .maybeSingle();

      if (tErr) {
        console.error('[BreachOS] Error fetching target team:', tErr);
      }

      let effAttackerId = attackerTeamId;

      if (tTeam) {
        setTargetTeam(tTeam);
        // If current attackerTeamId is empty or fallback placeholder, resolve dynamically from opponent_id
        if ((!effAttackerId || effAttackerId === 'team-alpha') && tTeam.opponent_id) {
          effAttackerId = tTeam.opponent_id;
          setAttackerTeamId(effAttackerId);
          try {
            sessionStorage.setItem('traz_attacker_team_id', effAttackerId);
            sessionStorage.setItem('traz_team_id', effAttackerId);
          } catch (e) {
            console.warn(e);
          }
        }
      } else {
        const fallbackCred = generateSingleCredentials();
        setTargetTeam({
          id: targetTeamId,
          name: 'OPPONENT_NODE',
          system_username: 'target_root',
          system_password: fallbackCred.password,
          password_category: fallbackCred.category,
          password_hint: fallbackCred.hint,
          opponent_id: effAttackerId,
          game_id: null
        });
      }

      // Fetch Attacker Team
      if (effAttackerId && effAttackerId !== 'team-alpha') {
        const { data: aTeam, error: aErr } = await supabase
          .from('teams')
          .select('*')
          .eq('id', effAttackerId)
          .maybeSingle();

        if (aErr) {
          console.error('[BreachOS] Error fetching attacker team:', aErr);
        }
        if (aTeam) {
          setAttackerTeam(aTeam);
        }
      }

      // Fetch Target's team_state
      const { data: sData } = await supabase
        .from('team_state')
        .select('*')
        .eq('team_id', targetTeamId)
        .maybeSingle();

      if (sData) {
        setTargetState(sData);
      } else {
        setTargetState({
          team_id: targetTeamId,
          firewall_on: true,
          apps_locked: true,
          manage_unlocked: false,
          devices_compromised: false,
          database_locked: false
        });
      }

      // Fetch Layer Progress for attacker
      if (effAttackerId && effAttackerId !== 'team-alpha') {
        const { data: progressRows, error: pErr } = await supabase
          .from('layer_progress')
          .select('*')
          .eq('attacker_team_id', effAttackerId)
          .order('layer_number', { ascending: true });

        if (pErr) {
          console.error('[BreachOS] Error fetching layer_progress:', pErr);
        }

        if (progressRows && progressRows.length > 0) {
          setLayerProgressList(progressRows);

          // Record start times and completed layers
          const times = {};
          const completed = new Set();
          let highestUnlocked = 1;

          progressRows.forEach((r) => {
            if (r.started_at) {
              times[r.layer_number] = new Date(r.started_at).getTime();
            }
            if (r.completed_at) {
              completed.add(r.layer_number);
              if (r.layer_number + 1 > highestUnlocked && r.layer_number < 5) {
                highestUnlocked = r.layer_number + 1;
              } else if (r.layer_number === 5) {
                highestUnlocked = 5;
              }
            }
          });

          completedLayersRef.current = completed;
          setLayerStartTimes(times);
          setCurrentLayer(highestUnlocked);

          // If the current active layer hasn't started yet, record its start now
          if (!times[highestUnlocked] && !completed.has(highestUnlocked)) {
            const gId = tTeam?.game_id;
            recordLayerStart(highestUnlocked, gId, effAttackerId);
          }
        } else {
          // Record Layer 1 start
          const gId = tTeam?.game_id;
          recordLayerStart(1, gId, effAttackerId);
        }
      }
    } catch (err) {
      console.error('[BreachOS] Error initializing game data:', err);
    } finally {
      setLoading(false);
    }
  }, [targetTeamId, attackerTeamId]);

  useEffect(() => {
    initGameData();
  }, [initGameData]);

  // Record Layer Start
  const recordLayerStart = async (layerNum, gIdParam, customAttackerId) => {
    const now = Date.now();
    setLayerStartTimes((prev) => ({ ...prev, [layerNum]: now }));

    const effAttacker = customAttackerId || attackerTeamId;
    if (!effAttacker || effAttacker === 'team-alpha') return;

    try {
      let activeGameId = gIdParam || targetTeam?.game_id || attackerTeam?.game_id;
      if (!activeGameId) {
        const { data: tInfo } = await supabase
          .from('teams')
          .select('game_id')
          .or(`id.eq.${effAttacker},id.eq.${targetTeamId}`)
          .maybeSingle();
        activeGameId = tInfo?.game_id;
      }

      if (activeGameId) {
        const payload = {
          game_id: activeGameId,
          attacker_team_id: effAttacker,
          layer_number: layerNum,
          started_at: new Date(now).toISOString()
        };

        const { error: upsertErr } = await supabase.from('layer_progress').upsert(payload, {
          onConflict: 'game_id,attacker_team_id,layer_number'
        });
        if (upsertErr) {
          console.error(`[BreachOS] Error recording layer ${layerNum} start:`, upsertErr);
        }
      }
    } catch (e) {
      console.warn(`[BreachOS] Exception recording layer ${layerNum} start:`, e);
    }
  };

  // Complete a Layer
  const completeLayer = async (layerNum, explicitDuration = null) => {
    if (completedLayersRef.current.has(layerNum)) return;
    completedLayersRef.current.add(layerNum);

    let duration = explicitDuration;
    let startedMs = layerStartTimes[layerNum];

    if (!startedMs) {
      const existing = layerProgressList.find(p => p.layer_number === layerNum);
      if (existing?.started_at) {
        startedMs = new Date(existing.started_at).getTime();
      }
    }

    if (typeof duration === 'number' && duration > 1) {
      // Use explicit duration from completion handler
    } else if (startedMs) {
      duration = Math.max(1, Math.floor((Date.now() - startedMs) / 1000));
    } else {
      duration = Math.max(1, duration || 1);
    }

    const startedIso = startedMs
      ? new Date(startedMs).toISOString()
      : new Date(Date.now() - duration * 1000).toISOString();

    setShowLayerSuccessModal({
      layer: layerNum,
      duration: duration
    });

    const effAttacker = attackerTeamId;
    if (effAttacker && effAttacker !== 'team-alpha') {
      try {
        let activeGameId = targetTeam?.game_id || attackerTeam?.game_id;
        if (!activeGameId) {
          const { data: tInfo } = await supabase
            .from('teams')
            .select('game_id')
            .or(`id.eq.${effAttacker},id.eq.${targetTeamId}`)
            .maybeSingle();
          activeGameId = tInfo?.game_id;
        }

        if (activeGameId) {
          const payload = {
            game_id: activeGameId,
            attacker_team_id: effAttacker,
            layer_number: layerNum,
            started_at: startedIso,
            completed_at: new Date().toISOString(),
            duration_seconds: duration
          };

          const { error: compErr } = await supabase.from('layer_progress').upsert(payload, {
            onConflict: 'game_id,attacker_team_id,layer_number'
          });

          if (compErr) {
            console.error(`[BreachOS] Error completing layer ${layerNum} in layer_progress:`, compErr);
          } else {
            console.log(`[BreachOS] Layer ${layerNum} recorded in layer_progress:`, payload);
          }
        } else {
          console.error(`[BreachOS] Cannot record layer ${layerNum}: activeGameId missing`);
        }
      } catch (e) {
        console.error(`[BreachOS] Exception completing layer ${layerNum}:`, e);
      }
    }

    // Advance to next layer if under 5
    if (layerNum < 5) {
      const nextL = layerNum + 1;
      setTimeout(() => {
        setCurrentLayer(nextL);
        recordLayerStart(nextL);
      }, 2500);
    }
  };

  // 2. Real-time Subscription to target's team_state
  useEffect(() => {
    if (!targetTeamId) return;

    const channel = supabase
      .channel(`breach_target_state_${targetTeamId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_state',
          filter: `team_id=eq.${targetTeamId}`
        },
        (payload) => {
          if (payload.new) {
            setTargetState(payload.new);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [targetTeamId]);

  // 3. Real-time Subscription to layer_progress updates
  useEffect(() => {
    if (!attackerTeamId) return;

    const channel = supabase
      .channel(`breach_layer_progress_${attackerTeamId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'layer_progress',
          filter: `attacker_team_id=eq.${attackerTeamId}`
        },
        (payload) => {
          if (payload.new) {
            setLayerProgressList((prev) => {
              const filtered = prev.filter((p) => p.layer_number !== payload.new.layer_number);
              return [...filtered, payload.new];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [attackerTeamId]);

  // 4. Automated Layer Completion Detection based on targetState changes
  useEffect(() => {
    if (!targetState) return;

    // Layer 2 Check: Opponent firewall disabled
    if (currentLayer === 2 && targetState.firewall_on === false) {
      completeLayer(2);
    }

    // Layer 3 Check: Opponent apps unlocked via Cracker
    if (currentLayer === 3 && targetState.apps_locked === false) {
      completeLayer(3);
    }

    // Layer 4 Check: Manage unlocked via stego key
    if (currentLayer === 4 && targetState.manage_unlocked === true) {
      completeLayer(4);
    }

    // Layer 5 Check: Database locked via ransomware
    if (
      currentLayer === 5 &&
      (targetState.database_locked === true || targetState.devices_compromised === true)
    ) {
      completeLayer(5);
    }
  }, [currentLayer, targetState]);

  // Handler when Layer 1 password is breached
  const handleLayer1Complete = (completionData) => {
    completeLayer(1, completionData?.durationSeconds);
  };

  if (loading) {
    return (
      <div className="w-full h-screen bg-black flex flex-col items-center justify-center font-mono text-red-500">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-bold tracking-widest uppercase animate-pulse">
            INITIALIZING OFFENSIVE BREACH PROTOCOLS...
          </span>
        </div>
        <span className="text-xs text-gray-500">TARGET: {targetTeamId}</span>
      </div>
    );
  }

  // If in Layer 1, display full-screen PasswordBreach overlay
  if (currentLayer === 1) {
    return (
      <AntiCheat
        teamId={attackerTeamId}
        gameId={attackerTeam?.game_id || targetTeam?.game_id}
        onForfeit={handleForfeit}
      >
        <div className="relative w-full h-screen overflow-hidden bg-black">
          {/* Layer 1 password cracker */}
          <PasswordBreach
            targetTeamId={targetTeamId}
            attackerTeamId={attackerTeamId}
            onComplete={handleLayer1Complete}
          />
        </div>
      </AntiCheat>
    );
  }

  return (
    <AntiCheat
      teamId={attackerTeamId}
      gameId={attackerTeam?.game_id || targetTeam?.game_id}
      onForfeit={handleForfeit}
    >
      <div className="relative w-full h-screen overflow-hidden bg-neutral-950 font-mono select-none flex flex-col">

      {/* Layer Completion Celebration Modal */}
      {showLayerSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="max-w-md w-full bg-neutral-950 border-2 border-emerald-500 rounded-xl p-6 text-center shadow-[0_0_40px_rgba(16,185,129,0.5)] font-mono">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-emerald-950 border border-emerald-400 flex items-center justify-center text-emerald-400 text-xl font-bold">
              ✓
            </div>
            <h3 className="text-xl font-black text-emerald-400 uppercase tracking-widest mb-1">
              LAYER {showLayerSuccessModal.layer} COMPROMISED!
            </h3>
            <p className="text-xs text-gray-300 mb-4">
              Defensive barrier neutralized. Duration: <strong className="text-white">{showLayerSuccessModal.duration}s</strong>.
            </p>

            {showLayerSuccessModal.layer < 5 ? (
              <div className="text-xs text-emerald-300 animate-pulse font-bold">
                Transitioning to Layer {showLayerSuccessModal.layer + 1}...
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-sm font-black text-amber-400 tracking-wider">
                  🏆 COMPLETE SYSTEM BREACH ACHIEVED!
                </div>
                <div className="text-xs text-gray-400">
                  Target database encrypted and fully controlled.
                </div>
              </div>
            )}

            <button
              onClick={() => setShowLayerSuccessModal(null)}
              className="mt-5 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-black font-extrabold text-xs uppercase tracking-wider rounded transition"
            >
              CONTINUE OPERATION
            </button>
          </div>
        </div>
      )}

      {/* WebOS Desktop in Attacker Mode */}
      <div className="flex-1 relative overflow-hidden">
        <Desktop
          teamId={attackerTeamId}
          isAttacker={true}
          opponentTeamId={targetTeamId}
          teamData={targetTeam}
        />
      </div>
    </div>
  </AntiCheat>
);
}
