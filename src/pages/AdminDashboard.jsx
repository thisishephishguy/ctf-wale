import React, { useState, useEffect, useRef, useMemo } from 'react';
import supabase from '../lib/supabase';
import {
  CATEGORIES,
  SPECIAL_CHARS,
  generatePairingCredentials,
  generateSingleCredentials
} from '../lib/categories';

// Helper function for generating random alphanumeric codes
const generateCode = (length = 6) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

// Steganography word pool for fully randomized 3-word combinations
const STEGO_WORD_POOL = [
  'shadow', 'falcon', 'tiger', 'blade', 'frost', 'storm', 'strike', 'fang',
  'cyber', 'pulse', 'solar', 'viper', 'spark', 'nexus', 'vortex', 'prism',
  'echo', 'signal', 'vector', 'cipher', 'flux', 'beacon', 'orbit', 'matrix',
  'quantum', 'blaze', 'titan', 'apex', 'flare', 'zenith', 'stellar', 'plasma',
  'nebula', 'shield', 'phantom', 'hyper', 'mirage', 'sonic', 'turbo', 'aurora',
  'comet', 'meteor', 'laser', 'radar', 'sonar', 'glyph', 'rune', 'crest',
  'flame', 'talon', 'claw', 'hawk', 'iron', 'steel', 'fury', 'ghost',
  'delta', 'omega', 'alpha', 'raptor', 'rebel', 'hazard', 'covert', 'crypto'
];

const FOLDERS = ['System', 'Documents', 'Projects', 'Archives', 'Backups', 'Temp'];

const LAYER_DEFINITIONS = [
  { number: 1, name: 'Physical/Password', desc: 'Hardware bypass & OS credentials' },
  { number: 2, name: 'Network', desc: 'Port scanning & traffic interception' },
  { number: 3, name: 'Application', desc: 'Web vulnerability exploitation' },
  { number: 4, name: 'Endpoint', desc: 'Steganography fragment extraction' },
  { number: 5, name: 'Database', desc: 'SQL payload & master flag exfiltration' }
];

export default function AdminDashboard() {
  // All pairings (games) list
  const [games, setGames] = useState([]);
  const [teamsByGame, setTeamsByGame] = useState({});
  const [teamStates, setTeamStates] = useState({});
  const [layerProgress, setLayerProgress] = useState({});
  const [forfeitEvents, setForfeitEvents] = useState([]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [gamesLoaded, setGamesLoaded] = useState(false);
  const [creatingGame, setCreatingGame] = useState(false);
  const [deployingGameId, setDeployingGameId] = useState(null);
  const [deletingGameId, setDeletingGameId] = useState(null);
  const [notification, setNotification] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);
  const [expandedGames, setExpandedGames] = useState({});
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const channelRef = useRef(null);
  const forfeitChannelRef = useRef(null);

  // Show temporary toast notification
  const showToast = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  // Copy with click feedback
  const copyToClipboard = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showToast(`Copied to clipboard: ${text}`, 'success');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Format layer completion duration using duration_seconds from layer_progress row (formatted as Xm Ys)
  const formatLayerDuration = (row) => {
    if (!row) return '';
    let sec = null;

    // 1. Calculate actual elapsed time if started_at and completed_at exist
    if (row.completed_at && row.started_at) {
      const start = new Date(row.started_at).getTime();
      const end = new Date(row.completed_at).getTime();
      if (end >= start) {
        const diff = Math.floor((end - start) / 1000);
        if (diff > 0) sec = diff;
      }
    }

    // 2. If duration_seconds is provided, use it if larger or if sec wasn't computed
    let explicitSec = null;
    if (typeof row.duration_seconds === 'number' && !isNaN(row.duration_seconds)) {
      explicitSec = row.duration_seconds;
    } else if (row.duration_seconds !== null && row.duration_seconds !== undefined && row.duration_seconds !== '') {
      explicitSec = parseInt(row.duration_seconds, 10);
    }

    if (explicitSec !== null && !isNaN(explicitSec) && explicitSec > 0) {
      if (sec === null || sec <= 1 || explicitSec > sec) {
        sec = explicitSec;
      }
    }

    if (sec === null || isNaN(sec) || sec <= 0) return '0m 1s';
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}m ${secs}s`;
  };

  // Calculate duration string fallback: e.g. "3m 42s"
  const calculateDuration = (startedAt, completedAt, gameCreatedAt) => {
    if (!completedAt) return null;
    const start = startedAt ? new Date(startedAt).getTime() : gameCreatedAt ? new Date(gameCreatedAt).getTime() : null;
    const end = new Date(completedAt).getTime();
    if (!start || end < start) return '1m 20s';

    const diffSec = Math.max(1, Math.floor((end - start) / 1000));
    const mins = Math.floor(diffSec / 60);
    const secs = diffSec % 60;
    return `${mins}m ${secs}s`;
  };

  // Generate category-based password
  const generateTeamCredentials = () => generateSingleCredentials();

  // Fetch all pairings and related data
  const loadAllPairings = async () => {
    setLoading(true);
    // 1. Fetch all games
    const { data: gamesData, error: gamesErr } = await supabase
      .from('games')
      .select('*')
      .order('created_at', { ascending: false });

    if (gamesErr) {
      showToast('DB Error: ' + gamesErr.message, 'error');
      console.error('[TRAZ DB]', gamesErr);
      setLoading(false);
      setGamesLoaded(true);
      return;
    }

    const loadedGames = gamesData || [];
    setGames(loadedGames);

    // Auto-expand games by default (first 3)
    const initialExpanded = {};
    loadedGames.forEach((g, idx) => {
      initialExpanded[g.id] = idx < 3;
    });
    setExpandedGames(prev => ({ ...initialExpanded, ...prev }));

    if (loadedGames.length === 0) {
      setTeamsByGame({});
      setTeamStates({});
      setLayerProgress({});
      setLoading(false);
      setGamesLoaded(true);
      return;
    }

    const gameIds = loadedGames.map(g => g.id);

    // 2. Fetch all teams for these games
    const { data: teamsData, error: teamsErr } = await supabase
      .from('teams')
      .select('*')
      .in('game_id', gameIds)
      .order('name', { ascending: true });

    if (teamsErr) {
      showToast('DB Error: ' + teamsErr.message, 'error');
      console.error('[TRAZ DB]', teamsErr);
      setLoading(false);
      setGamesLoaded(true);
      return;
    }

    const teamsMap = {};
    const forfeits = [];

    (teamsData || []).forEach(team => {
      if (!teamsMap[team.game_id]) {
        teamsMap[team.game_id] = [];
      }
      teamsMap[team.game_id].push(team);

      if (team.forfeited) {
        const game = loadedGames.find(g => g.id === team.game_id);
        forfeits.push({
          id: `forfeit_${team.id}`,
          teamId: team.id,
          teamName: team.name,
          gameId: team.game_id,
          gameName: game?.name || `Match #${team.game_id.substring(0, 8)}`,
          reason: team.forfeit_reason || 'DevTools Detected',
          timestamp: team.forfeit_at || team.created_at || new Date().toISOString()
        });
      }
    });
    setTeamsByGame(teamsMap);

    // 3. Fetch team states
    const teamIds = (teamsData || []).map(t => t.id);
    if (teamIds.length > 0) {
      const { data: statesData, error: statesErr } = await supabase
        .from('team_state')
        .select('*')
        .in('team_id', teamIds);

      if (statesErr) {
        showToast('DB Error: ' + statesErr.message, 'error');
        console.error('[TRAZ DB]', statesErr);
      } else {
        const statesMap = {};
        (statesData || []).forEach(st => {
          statesMap[st.team_id] = st;
        });
        setTeamStates(statesMap);
      }
    }

    // 4. Fetch layer progress across all managed games
    const { data: progData, error: progErr } = await supabase
      .from('layer_progress')
      .select('*');

    if (progErr) {
      showToast('DB Error: ' + progErr.message, 'error');
      console.error('[TRAZ DB]', progErr);
    } else {
      const progMap = {};
      (progData || []).forEach(lp => {
        const teamKey = lp.attacker_team_id || lp.team_id;
        if (!teamKey) return;
        if (!progMap[teamKey]) progMap[teamKey] = [];
        progMap[teamKey].push(lp);
      });
      setLayerProgress(progMap);
    }

    // Sort forfeits newest first
    setForfeitEvents(forfeits.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
    setLoading(false);
    setGamesLoaded(true);
  };

  // Initial load & background sync every 6 seconds to ensure 100% resilient dashboard updates
  useEffect(() => {
    loadAllPairings();

    const interval = setInterval(async () => {
      try {
        const { data: progData } = await supabase.from('layer_progress').select('*');
        if (progData) {
          const progMap = {};
          progData.forEach(lp => {
            const teamKey = lp.attacker_team_id || lp.team_id;
            if (!teamKey) return;
            if (!progMap[teamKey]) progMap[teamKey] = [];
            progMap[teamKey].push(lp);
          });
          setLayerProgress(progMap);
        }

        const { data: statesData } = await supabase.from('team_state').select('*');
        if (statesData) {
          const statesMap = {};
          statesData.forEach(st => {
            statesMap[st.team_id] = st;
          });
          setTeamStates(statesMap);
        }
      } catch (err) {
        // silent background sync
      }
    }, 6000);

    return () => clearInterval(interval);
  }, []);

  // Realtime Subscriptions - Initialized AFTER games/pairings are loaded
  useEffect(() => {
    if (!gamesLoaded) return;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel('admin-dashboard-global')
      // Listen to games table updates
      .on('postgres_changes', { event: '*', schema: 'public', table: 'games' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setGames(prev => [payload.new, ...prev.filter(g => g.id !== payload.new.id)]);
        } else if (payload.eventType === 'UPDATE') {
          setGames(prev => prev.map(g => (g.id === payload.new.id ? { ...g, ...payload.new } : g)));
        } else if (payload.eventType === 'DELETE') {
          const deletedId = payload.old?.id;
          if (deletedId) {
            setGames(prev => prev.filter(g => g.id !== deletedId));
            setTeamsByGame(prev => {
              const next = { ...prev };
              delete next[deletedId];
              return next;
            });
          }
        }
      })
      // Listen to teams table updates (e.g. for forfeits or credentials)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, (payload) => {
        if (payload.new) {
          const updatedTeam = payload.new;
          setTeamsByGame(prev => {
            const next = { ...prev };
            const list = next[updatedTeam.game_id] ? [...next[updatedTeam.game_id]] : [];
            const idx = list.findIndex(t => t.id === updatedTeam.id);
            if (idx >= 0) {
              list[idx] = { ...list[idx], ...updatedTeam };
            } else {
              list.push(updatedTeam);
            }
            next[updatedTeam.game_id] = list;
            return next;
          });

          // If team forfeited, record event
          if (updatedTeam.forfeited) {
            setForfeitEvents(prev => {
              if (prev.some(f => f.teamId === updatedTeam.id)) return prev;
              const newForfeit = {
                id: `forfeit_${updatedTeam.id}_${Date.now()}`,
                teamId: updatedTeam.id,
                teamName: updatedTeam.name,
                gameId: updatedTeam.game_id,
                gameName: `Match #${updatedTeam.game_id.substring(0, 8)}`,
                reason: updatedTeam.forfeit_reason || 'DevTools Detected',
                timestamp: updatedTeam.forfeit_at || new Date().toISOString()
              };
              return [newForfeit, ...prev];
            });
            showToast(`⚠️ FORFEIT DETECTED: ${updatedTeam.name} forfeited via DevTools!`, 'error');
          }
        }
      })
      // Listen to ALL team_state table updates across all games
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_state' }, (payload) => {
        if (payload.new) {
          const stateRow = payload.new;
          const tId = stateRow.team_id || stateRow.id;
          if (tId) {
            setTeamStates(prev => ({
              ...prev,
              [tId]: { ...(prev[tId] || {}), ...stateRow }
            }));

            if (stateRow.forfeited) {
              setForfeitEvents(prev => {
                if (prev.some(f => f.teamId === tId)) return prev;
                const newForfeit = {
                  id: `forfeit_${tId}_${Date.now()}`,
                  teamId: tId,
                  teamName: 'Team',
                  gameId: stateRow.game_id || 'Unknown',
                  gameName: 'Active Match',
                  reason: stateRow.forfeit_reason || 'DevTools Detected',
                  timestamp: stateRow.forfeit_at || new Date().toISOString()
                };
                return [newForfeit, ...prev];
              });
            }
          }
        }
      })
      // Listen to ALL layer_progress updates across all games (no game_id filter needed)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'layer_progress' }, (payload) => {
        if (payload.new) {
          const row = payload.new;
          const teamId = row.attacker_team_id || row.team_id;
          if (!teamId) return;

          setLayerProgress(prev => {
            const next = { ...prev };
            const currentList = next[teamId] ? [...next[teamId]] : [];
            const idx = currentList.findIndex(
              p => Number(p.layer_number) === Number(row.layer_number)
            );
            if (idx >= 0) {
              currentList[idx] = { ...currentList[idx], ...row };
            } else {
              currentList.push(row);
            }
            next[teamId] = currentList;
            return next;
          });

          // If Layer 5 completed, check if game needs to mark winner
          if (Number(row.layer_number) === 5 && row.completed_at) {
            const targetGameId = row.game_id || Object.keys(teamsByGame).find(gid =>
              (teamsByGame[gid] || []).some(t => t.id === teamId)
            );
            if (targetGameId) {
              handleAutoFinishGame(targetGameId, teamId);
            }
          }
        }
      })
      .subscribe((status) => {
        console.log('[AdminDashboard Realtime] subscription status:', status);
      });

    channelRef.current = channel;

    // Dedicated forfeit events broadcast channel
    const forfeitChan = supabase
      .channel('forfeit_events')
      .on('broadcast', { event: 'devtools_forfeit' }, (payload) => {
        const payloadData = payload?.payload || {};
        setForfeitEvents(prev => [
          {
            id: `broadcast_${Date.now()}_${Math.random()}`,
            teamId: payloadData.teamId || 'unknown',
            teamName: payloadData.teamName || 'Unknown Team',
            gameId: payloadData.gameId || 'N/A',
            gameName: payloadData.gameName || 'CTF Match',
            reason: payloadData.reason || 'DevTools Detected',
            timestamp: payloadData.timestamp || new Date().toISOString()
          },
          ...prev
        ]);
        showToast(`🚨 DISQUALIFICATION: ${payloadData.teamName || 'A team'} triggered DevTools!`, 'error');
      })
      .subscribe();

    forfeitChannelRef.current = forfeitChan;

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      if (forfeitChannelRef.current) supabase.removeChannel(forfeitChannelRef.current);
    };
  }, [gamesLoaded]);

  // Handle auto finishing match when Layer 5 is captured
  const handleAutoFinishGame = async (gameId, winnerTeamId) => {
    const { error } = await supabase
      .from('games')
      .update({
        status: 'finished',
        winner_team_id: winnerTeamId
      })
      .eq('id', gameId);

    if (error) {
      showToast('DB Error: ' + error.message, 'error');
      console.error('[TRAZ DB]', error);
      return;
    }

    setGames(prev =>
      prev.map(g => (g.id === gameId ? { ...g, status: 'finished', winner_team_id: winnerTeamId } : g))
    );
  };

  // 1. CREATE NEW PAIRING HANDLER
  const handleCreatePairing = async () => {
    setCreatingGame(true);
    const matchNumber = Math.floor(1000 + Math.random() * 9000);
    const gamePayload = {
      name: `TRAZ Match #${matchNumber}`,
      status: 'created',
      created_at: new Date().toISOString(),
      winner_team_id: null
    };

    const { data: createdGame, error: gameError } = await supabase
      .from('games')
      .insert([gamePayload])
      .select()
      .single();

    if (gameError) {
      showToast('DB Error: ' + gameError.message, 'error');
      console.error('[TRAZ DB]', gameError);
      setCreatingGame(false);
      return;
    }

    // Generate credentials with CSPRNG: guaranteed distinct categories and words for Team A and Team B
    const { credA, credB } = generatePairingCredentials();

    // Build team payloads — omit 'id' entirely so Supabase auto-generates via gen_random_uuid()
    const teamAData = {
      game_id: createdGame.id,
      name: 'Team A',
      team_code: generateCode(6),
      bridge_code: generateCode(6),
      system_username: `user_${generateCode(4).toLowerCase()}`,
      system_password: credA.password,
      password_category: credA.category,
      password_hint: credA.hint,
      instance_url: `/system/a-${generateCode(8).toLowerCase()}`,
      first_login_done: false,
      forfeited: false,
      created_at: new Date().toISOString()
    };

    const teamBData = {
      game_id: createdGame.id,
      name: 'Team B',
      team_code: generateCode(6),
      bridge_code: generateCode(6),
      system_username: `user_${generateCode(4).toLowerCase()}`,
      system_password: credB.password,
      password_category: credB.category,
      password_hint: credB.hint,
      instance_url: `/system/b-${generateCode(8).toLowerCase()}`,
      first_login_done: false,
      forfeited: false,
      created_at: new Date().toISOString()
    };

    // Insert Team A
    const { data: teamAInsert, error: errA } = await supabase
      .from('teams')
      .insert([teamAData])
      .select()
      .single();

    if (errA) {
      showToast('DB Error: ' + errA.message, 'error');
      console.error('[TRAZ DB]', errA);
      setCreatingGame(false);
      return;
    }

    // Insert Team B
    const { data: teamBInsert, error: errB } = await supabase
      .from('teams')
      .insert([teamBData])
      .select()
      .single();

    if (errB) {
      showToast('DB Error: ' + errB.message, 'error');
      console.error('[TRAZ DB]', errB);
      setCreatingGame(false);
      return;
    }

    // Update opponent cross-references
    const { error: oppErrA } = await supabase
      .from('teams')
      .update({ opponent_id: teamBInsert.id })
      .eq('id', teamAInsert.id);

    if (oppErrA) {
      showToast('DB Error: ' + oppErrA.message, 'error');
      console.error('[TRAZ DB]', oppErrA);
    }

    const { error: oppErrB } = await supabase
      .from('teams')
      .update({ opponent_id: teamAInsert.id })
      .eq('id', teamBInsert.id);

    if (oppErrB) {
      showToast('DB Error: ' + oppErrB.message, 'error');
      console.error('[TRAZ DB]', oppErrB);
    }

    teamAInsert.opponent_id = teamBInsert.id;
    teamBInsert.opponent_id = teamAInsert.id;
    const insertedTeams = [teamAInsert, teamBInsert];

    // Generate fresh random steganography fragments & state per pairing
    const newTeamStates = {};
    const newLayerProgress = {};
    const allStegoRows = [];

    for (let i = 0; i < insertedTeams.length; i++) {
      const team = insertedTeams[i];

      // Fresh, fully randomized 3-word stego password per team
      const shuffledPool = [...STEGO_WORD_POOL].sort(() => Math.random() - 0.5);
      const realWords = shuffledPool.slice(0, 3);
      const decoyWords = shuffledPool.slice(3, 6);
      const endpointPassword = realWords.join('');

      const correctFolder = FOLDERS[Math.floor(Math.random() * FOLDERS.length)];

      // Assign image_index 0-5 randomly shuffled
      const imageIndices = [0, 1, 2, 3, 4, 5].sort(() => Math.random() - 0.5);

      // 3 Real fragments
      const realFragments = realWords.map((word, index) => ({
        team_id: team.id,
        image_index: imageIndices[index],
        word: word,
        order_marker: index + 1,
        folder_name: correctFolder,
        created_at: new Date().toISOString()
      }));

      // 3 Decoy fragments
      const decoyFragments = decoyWords.map((word, index) => ({
        team_id: team.id,
        image_index: imageIndices[index + 3],
        word: word,
        order_marker: index + 4,
        folder_name: correctFolder,
        created_at: new Date().toISOString()
      }));

      const combinedFragments = [...realFragments, ...decoyFragments];
      allStegoRows.push(...combinedFragments);

      // Team state row
      const tState = {
        team_id: team.id,
        firewall_on: true,
        firewall_reinforced: false,
        firewall_reinforce_used: false,
        apps_locked: true,
        apps_block_used: false,
        apps_relocked: false,
        devices_compromised: false,
        database_locked: false,
        endpoint_password: endpointPassword,
        manage_unlocked: false,
        files_dropped: [],
        updated_at: new Date().toISOString()
      };
      newTeamStates[team.id] = tState;

      const { error: stErr } = await supabase
        .from('team_state')
        .insert([tState]);

      if (stErr) {
        showToast('DB Error: ' + stErr.message, 'error');
        console.error('[TRAZ DB]', stErr);
      }

      // 5 Layers per attacker team
      const teamLayers = LAYER_DEFINITIONS.map(def => ({
        game_id: createdGame.id,
        attacker_team_id: team.id,
        layer_number: def.number,
        started_at: null,
        completed_at: null,
        duration_seconds: null
      }));

      newLayerProgress[team.id] = teamLayers;

      const { error: lpErr } = await supabase
        .from('layer_progress')
        .insert(teamLayers);

      if (lpErr) {
        showToast('DB Error: ' + lpErr.message, 'error');
        console.error('[TRAZ DB]', lpErr);
      }
    }

    // Insert stego fragments into Supabase
    if (allStegoRows.length > 0) {
      const { error: stegoErr } = await supabase
        .from('stego_fragments')
        .insert(allStegoRows);

      if (stegoErr) {
        showToast('DB Error: ' + stegoErr.message, 'error');
        console.error('[TRAZ DB]', stegoErr);
      }
    }

    // Update state
    setGames(prev => [createdGame, ...prev]);
    setTeamsByGame(prev => ({ ...prev, [createdGame.id]: insertedTeams }));
    setTeamStates(prev => ({ ...prev, ...newTeamStates }));
    setLayerProgress(prev => ({ ...prev, ...newLayerProgress }));
    setExpandedGames(prev => ({ ...prev, [createdGame.id]: true }));

    showToast(`Pairing "${createdGame.name}" successfully created!`, 'success');
    setCreatingGame(false);
  };

  // 2. DEPLOY PAIRING HANDLER
  const handleDeployGame = async (gameId) => {
    setDeployingGameId(gameId);
    const { error } = await supabase
      .from('games')
      .update({ status: 'active' })
      .eq('id', gameId);

    if (error) {
      showToast('DB Error: ' + error.message, 'error');
      console.error('[TRAZ DB]', error);
      setDeployingGameId(null);
      return;
    }

    setGames(prev => prev.map(g => (g.id === gameId ? { ...g, status: 'active' } : g)));
    showToast(`Match deployed! Both teams are cleared for combat.`, 'success');
    setDeployingGameId(null);
  };

  // 3. DELETE PAIRING HANDLER (CASCADE DELETE)
  const handleDeleteGame = async (gameId) => {
    if (!window.confirm('Delete this pairing? All credentials, progress, and state will be permanently erased.')) {
      return;
    }

    setDeletingGameId(gameId);
    const { error } = await supabase
      .from('games')
      .delete()
      .eq('id', gameId);

    if (error) {
      showToast('DB Error: ' + error.message, 'error');
      console.error('[TRAZ DB]', error);
      setDeletingGameId(null);
      return;
    }

    // Clean up UI state
    setGames(prev => prev.filter(g => g.id !== gameId));
    setTeamsByGame(prev => {
      const next = { ...prev };
      delete next[gameId];
      return next;
    });
    setForfeitEvents(prev => prev.filter(f => f.gameId !== gameId));

    showToast('Pairing deleted. You can now create a fresh pairing.', 'success');
    setDeletingGameId(null);
  };

  // Toggle Layer Progress for testing/simulation
  const handleToggleLayer = async (gameId, teamId, layerNumber) => {
    const teamProg = layerProgress[teamId] || [];
    const layer = teamProg.find(p => p.layer_number === layerNumber);
    const now = new Date().toISOString();

    let updated = null;
    if (!layer || (!layer.started_at && !layer.completed_at)) {
      // Start layer
      updated = {
        ...(layer || {}),
        game_id: gameId,
        attacker_team_id: teamId,
        layer_number: layerNumber,
        started_at: now,
        completed_at: null,
        duration_seconds: null
      };
    } else if (layer.started_at && !layer.completed_at) {
      // Complete layer
      const duration = Math.max(1, Math.floor((new Date(now).getTime() - new Date(layer.started_at).getTime()) / 1000));
      updated = {
        ...(layer || {}),
        game_id: gameId,
        attacker_team_id: teamId,
        layer_number: layerNumber,
        completed_at: now,
        duration_seconds: duration
      };
    } else {
      // Reset layer
      updated = {
        ...(layer || {}),
        game_id: gameId,
        attacker_team_id: teamId,
        layer_number: layerNumber,
        started_at: null,
        completed_at: null,
        duration_seconds: null
      };
    }

    // Upsert to Supabase
    const { error } = await supabase
      .from('layer_progress')
      .upsert(updated, { onConflict: 'game_id,attacker_team_id,layer_number' });

    if (error) {
      showToast('DB Error: ' + error.message, 'error');
      console.error('[TRAZ DB]', error);
    }

    // Update local state
    setLayerProgress(prev => {
      const next = { ...prev };
      const list = [...(next[teamId] || [])];
      const idx = list.findIndex(p => p.layer_number === layerNumber);
      if (idx >= 0) {
        list[idx] = updated;
      } else {
        list.push(updated);
      }
      next[teamId] = list;
      return next;
    });

    // Check if team won (layer 5 completed)
    if (layerNumber === 5 && updated.completed_at) {
      handleAutoFinishGame(gameId, teamId);
      const teamObj = (teamsByGame[gameId] || []).find(t => t.id === teamId);
      showToast(`🏆 ${teamObj?.name || 'Team'} has captured all 5 layers and won!`, 'success');
    }
  };

  // Toggle card expansion
  const toggleExpand = (gameId) => {
    setExpandedGames(prev => ({
      ...prev,
      [gameId]: !prev[gameId]
    }));
  };

  // Filtered games
  const filteredGames = useMemo(() => {
    return games.filter(g => {
      const matchesSearch =
        !searchFilter ||
        g.name?.toLowerCase().includes(searchFilter.toLowerCase()) ||
        g.id?.toLowerCase().includes(searchFilter.toLowerCase());

      const status = g.status?.toLowerCase() || 'created';
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'created' && (status === 'created' || status === 'pending')) ||
        (statusFilter === 'active' && (status === 'active' || status === 'deployed')) ||
        (statusFilter === 'finished' && (status === 'finished' || status === 'completed'));

      return matchesSearch && matchesStatus;
    });
  }, [games, searchFilter, statusFilter]);

  // Overall Stats
  const stats = useMemo(() => {
    const total = games.length;
    const active = games.filter(g => g.status === 'active' || g.status === 'deployed').length;
    const finished = games.filter(g => g.status === 'finished' || g.status === 'completed').length;
    const forfeits = forfeitEvents.length;
    return { total, active, finished, forfeits };
  }, [games, forfeitEvents]);

  return (
    <div className="min-h-screen overflow-y-auto bg-slate-950 text-slate-100 font-mono p-3 sm:p-6 md:p-8 selection:bg-emerald-500 selection:text-black">
      {/* Background Cyber Grid */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(#10b98115_1px,transparent_1px)] [background-size:24px_24px] opacity-60 z-0" />

      <div className="relative z-10 max-w-7xl mx-auto space-y-8">

        {/* ==================== 1. TOP HEADER & CONTROLS ==================== */}
        <header className="border-b border-slate-800/80 pb-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div>
              <div className="flex items-center gap-3">
                <span className="h-3.5 w-3.5 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)] animate-pulse" />
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-wider bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
                  TRAZ // MULTI-MATCH ADMIN CONSOLE
                </h1>
              </div>
              <p className="text-slate-400 text-xs sm:text-sm mt-1">
                Multi-pairing attack & defense CTF orchestration engine • Dynamic credentials & anti-cheat supervisor
              </p>
            </div>

            {/* Create Pairing Primary CTA */}
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={handleCreatePairing}
                disabled={creatingGame}
                className="w-full sm:w-auto px-6 py-3 rounded-xl font-black text-sm tracking-wide bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 shadow-lg shadow-emerald-500/25 transition-all duration-200 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 cursor-pointer"
              >
                {creatingGame ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-slate-950" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>INITIALIZING PAIRING...</span>
                  </>
                ) : (
                  <>
                    <span className="text-xl leading-none font-bold">+</span>
                    <span>CREATE NEW PAIRING</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick Metrics Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
            <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3">
              <span className="text-[10px] text-slate-500 uppercase tracking-widest block font-bold">TOTAL PAIRINGS</span>
              <span className="text-xl font-bold text-white font-mono">{stats.total}</span>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3">
              <span className="text-[10px] text-cyan-400 uppercase tracking-widest block font-bold">ACTIVE MATCHES</span>
              <span className="text-xl font-bold text-cyan-400 font-mono">{stats.active}</span>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3">
              <span className="text-[10px] text-emerald-400 uppercase tracking-widest block font-bold">FINISHED</span>
              <span className="text-xl font-bold text-emerald-400 font-mono">{stats.finished}</span>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3">
              <span className="text-[10px] text-rose-400 uppercase tracking-widest block font-bold">DISQUALIFIED / FORFEIT</span>
              <span className="text-xl font-bold text-rose-400 font-mono">{stats.forfeits}</span>
            </div>
          </div>
        </header>

        {/* TOAST NOTIFICATION */}
        {notification && (
          <div
            className={`p-4 rounded-xl border text-sm flex items-center justify-between transition-all shadow-xl animate-fade-in ${
              notification.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500 text-emerald-200 shadow-emerald-950/50'
                : notification.type === 'error'
                ? 'bg-rose-950/90 border-rose-500 text-rose-200 shadow-rose-950/50'
                : 'bg-slate-900/90 border-cyan-500 text-cyan-200 shadow-cyan-950/50'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">
                {notification.type === 'success' ? '✔' : notification.type === 'error' ? '🚨' : 'ℹ'}
              </span>
              <span className="font-medium">{notification.message}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-slate-400 hover:text-white ml-4 text-xs font-bold p-1"
            >
              ✕
            </button>
          </div>
        )}

        {/* ==================== 2. FILTER & SEARCH TOOLBAR ==================== */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-slate-900/40 p-3 rounded-xl border border-slate-800/80">
          <div className="flex items-center gap-2 flex-1">
            <span className="text-slate-500 text-xs">🔍</span>
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search pairings by Match Name or Game ID..."
              className="bg-transparent border-none text-xs text-white placeholder-slate-500 focus:outline-none w-full"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500 font-semibold uppercase">Filter:</span>
            {['all', 'created', 'active', 'finished'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded text-[11px] uppercase tracking-wider font-bold transition cursor-pointer ${
                  statusFilter === st
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                    : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* ==================== 3. LIST OF ALL PAIRINGS ==================== */}
        <section className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="text-emerald-400">01 //</span> ACTIVE & MANAGED PAIRINGS
              <span className="text-xs font-normal text-slate-500">({filteredGames.length} Total)</span>
            </h2>

            <button
              onClick={loadAllPairings}
              disabled={loading}
              className="text-xs text-slate-400 hover:text-cyan-400 flex items-center gap-1.5 transition cursor-pointer"
            >
              <span>{loading ? 'SYNCING...' : '🔄 REFRESH ALL'}</span>
            </button>
          </div>

          {filteredGames.length === 0 ? (
            <div className="p-12 text-center border-2 border-dashed border-slate-800 rounded-2xl bg-slate-900/30">
              <div className="text-4xl mb-3">⚔️</div>
              <h3 className="text-lg font-bold text-slate-300">No Team Pairings Found</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-6">
                There are currently no active pairings matching your filter. Click below to spawn a fresh pairing with independent Team A and Team B instances.
              </p>
              <button
                onClick={handleCreatePairing}
                disabled={creatingGame}
                className="px-6 py-2.5 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition cursor-pointer"
              >
                Create New Pairing Now
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredGames.map((game) => {
                const isExpanded = expandedGames[game.id] ?? false;
                const gameTeams = teamsByGame[game.id] || [];
                const teamA = gameTeams.find(t => t.name === 'Team A') || gameTeams[0];
                const teamB = gameTeams.find(t => t.name === 'Team B') || gameTeams[1];

                const status = (game.status || 'created').toLowerCase();
                const isCreated = status === 'created' || status === 'pending';
                const isActive = status === 'active' || status === 'deployed';
                const isFinished = status === 'finished' || status === 'completed';

                // Determine winner
                let winningTeam = null;
                if (game.winner_team_id) {
                  winningTeam = gameTeams.find(t => t.id === game.winner_team_id);
                }
                if (!winningTeam && isFinished) {
                  // Check if either team has completed Layer 5
                  for (const t of gameTeams) {
                    const prog = layerProgress[t.id] || [];
                    const l5 = prog.find(p => p.layer_number === 5);
                    if (l5 && l5.completed_at) {
                      winningTeam = t;
                      break;
                    }
                  }
                }

                return (
                  <div
                    key={game.id}
                    className={`rounded-2xl border transition-all duration-200 overflow-hidden backdrop-blur-md ${
                      isFinished
                        ? 'bg-slate-950/80 border-emerald-500/40 shadow-lg shadow-emerald-950/20'
                        : isActive
                        ? 'bg-slate-900/80 border-cyan-500/40 shadow-lg shadow-cyan-950/20'
                        : 'bg-slate-900/60 border-slate-800'
                    }`}
                  >
                    {/* PAIRING HEADER BAR */}
                    <div className="p-4 sm:p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/70 border-b border-slate-800/80">
                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          onClick={() => toggleExpand(game.id)}
                          className="h-7 w-7 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-xs text-slate-300 font-bold transition cursor-pointer"
                          title={isExpanded ? 'Collapse match panel' : 'Expand match panel'}
                        >
                          {isExpanded ? '▼' : '▶'}
                        </button>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-base sm:text-lg font-black text-white tracking-wide">
                              {game.name || `TRAZ Match #${game.id.substring(0, 6)}`}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${
                                isFinished
                                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                                  : isActive
                                  ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40 animate-pulse'
                                  : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                              }`}
                            >
                              {isFinished ? 'FINISHED' : isActive ? 'ACTIVE' : 'CREATED'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono mt-0.5">
                            <span>ID: {game.id}</span>
                            <span>•</span>
                            <span>Created: {new Date(game.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      </div>

                      {/* Header Actions */}
                      <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
                        {/* Winner Badge in Header */}
                        {isFinished && winningTeam && (
                          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-xs font-bold">
                            <span>🏆 WINNER:</span>
                            <span className="text-white underline">{winningTeam.name}</span>
                          </div>
                        )}

                        {/* DEPLOY BUTTON (Visible only when created/pending) */}
                        {isCreated && (
                          <button
                            onClick={() => handleDeployGame(game.id)}
                            disabled={deployingGameId === game.id}
                            className="px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-md shadow-cyan-500/20 transition active:scale-95 disabled:opacity-50 cursor-pointer"
                          >
                            {deployingGameId === game.id ? 'DEPLOYING...' : '⚡ DEPLOY'}
                          </button>
                        )}

                        {/* DELETE BUTTON (Visible on every pairing card) */}
                        <button
                          onClick={() => handleDeleteGame(game.id)}
                          disabled={deletingGameId === game.id}
                          className="px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-950/50 border border-rose-500 transition active:scale-95 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                          title="Permanently delete pairing"
                        >
                          {deletingGameId === game.id ? (
                            'DELETING...'
                          ) : (
                            <>
                              <span>🗑️</span>
                              <span>DELETE PAIRING</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* EXPANDABLE BODY CONTENT */}
                    {isExpanded && (
                      <div className="p-4 sm:p-6 space-y-6">

                        {/* INSTRUCTIONS RIBBON */}
                        <div className="p-3.5 rounded-xl bg-cyan-950/40 border border-cyan-800/60 text-cyan-200 text-xs flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <span className="text-base">⇄</span>
                            <span>
                              <strong>BRIDGE INSTRUCTION:</strong> Give <strong>Team A's bridge code</strong> to Team B, and give <strong>Team B's bridge code</strong> to Team A.
                            </span>
                          </div>
                          <span className="text-[10px] text-cyan-400 font-bold uppercase shrink-0">
                            CROSS-TARGET LINK
                          </span>
                        </div>

                        {/* WINNER SHOWCASE BANNER IF FINISHED */}
                        {isFinished && (
                          <div className="rounded-xl border-2 border-emerald-500 bg-gradient-to-r from-emerald-950/80 via-slate-950/90 to-teal-950/80 p-5 shadow-xl shadow-emerald-500/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                              <span className="text-4xl animate-bounce">🏆</span>
                              <div>
                                <div className="text-xs uppercase tracking-widest text-emerald-400 font-black">
                                  MATCH COMPLETE
                                </div>
                                <div className="text-xl font-black text-white">
                                  WINNER: <span className="text-emerald-400 underline">{winningTeam?.name || 'Assigned Winner'}</span>
                                </div>
                                <div className="text-[11px] text-slate-300 mt-0.5">
                                  All 5 layers penetrated and master database flag exfiltrated.
                                </div>
                              </div>
                            </div>

                            <button
                              onClick={() => handleDeleteGame(game.id)}
                              disabled={deletingGameId === game.id}
                              className="px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-950/60 border border-rose-400 transition cursor-pointer"
                            >
                              {deletingGameId === game.id ? 'DELETING...' : 'DELETE & CLEAR PAIRING'}
                            </button>
                          </div>
                        )}

                        {/* TEAM CREDENTIALS CARDS (TEAM A vs TEAM B) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                          {/* TEAM A CARD */}
                          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-5 space-y-4 hover:border-cyan-500/40 transition">
                            <div className="flex justify-between items-center pb-3 border-b border-slate-800/80">
                              <div className="flex items-center gap-2.5">
                                <span className="h-3 w-3 rounded-full bg-cyan-400" />
                                <span className="text-base font-bold text-white">
                                  {teamA?.name || 'Team A'}
                                </span>
                              </div>
                              <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 font-bold">
                                INSTANCE ALPHA
                              </span>
                            </div>

                            {/* Team Code */}
                            <div className="flex justify-between items-center bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                              <div>
                                <span className="text-[10px] text-slate-400 block font-semibold">TEAM CODE (Teams Login)</span>
                                <span className="text-sm font-black text-cyan-400 font-mono tracking-wider">
                                  {teamA?.team_code || '------'}
                                </span>
                              </div>
                              <button
                                onClick={() => copyToClipboard(teamA?.team_code, `${game.id}-teamA-code`)}
                                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 border border-slate-700 cursor-pointer"
                              >
                                {copiedKey === `${game.id}-teamA-code` ? '✓ Copied' : 'Copy'}
                              </button>
                            </div>

                            {/* Bridge Code */}
                            <div className="flex justify-between items-center bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                              <div>
                                <span className="text-[10px] text-slate-400 block font-semibold">BRIDGE CODE (Bridge Login)</span>
                                <span className="text-sm font-black text-emerald-400 font-mono tracking-wider">
                                  {teamA?.bridge_code || '------'}
                                </span>
                              </div>
                              <button
                                onClick={() => copyToClipboard(teamA?.bridge_code, `${game.id}-teamA-bridge`)}
                                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 border border-slate-700 cursor-pointer"
                              >
                                {copiedKey === `${game.id}-teamA-bridge` ? '✓ Copied' : 'Copy'}
                              </button>
                            </div>

                            {/* System URL */}
                            <div className="flex justify-between items-center bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                              <div>
                                <span className="text-[10px] text-slate-400 block font-semibold">SYSTEM URL PATH</span>
                                <span className="text-xs text-slate-300 font-mono">
                                  {teamA?.instance_url || `/system/a-${game.id.substring(0, 6)}`}
                                </span>
                              </div>
                              <button
                                onClick={() => copyToClipboard(teamA?.instance_url, `${game.id}-teamA-url`)}
                                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 border border-slate-700 cursor-pointer"
                              >
                                {copiedKey === `${game.id}-teamA-url` ? '✓ Copied' : 'Copy'}
                              </button>
                            </div>

                            {/* Credentials & Password Format Peek */}
                            <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-[10px] text-slate-500 uppercase block">USERNAME</span>
                                <span className="text-slate-300 font-bold font-mono">{teamA?.system_username || 'user_demo'}</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-500 uppercase block">INITIAL PASSWORD</span>
                                <span className="text-amber-400 font-bold font-mono">{teamA?.system_password || 'russia7$'}</span>
                                {teamA?.password_category && (
                                  <span className="text-[9px] text-slate-400 block mt-0.5">
                                    Category: <strong className="text-cyan-300">{teamA.password_category}</strong>
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Stego Fragment peek */}
                            {teamStates[teamA?.id] && (
                              <div className="p-2 rounded bg-slate-900/30 border border-slate-800 text-[11px] text-slate-400">
                                <span className="text-slate-500">L4 Stego Password: </span>
                                <span className="text-cyan-300 font-bold font-mono">{teamStates[teamA.id]?.endpoint_password}</span>
                                {teamStates[teamA.id]?.target_folder && (
                                  <span className="text-slate-500 text-[10px] ml-1">({teamStates[teamA.id]?.target_folder} folder)</span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* TEAM B CARD */}
                          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-5 space-y-4 hover:border-emerald-500/40 transition">
                            <div className="flex justify-between items-center pb-3 border-b border-slate-800/80">
                              <div className="flex items-center gap-2.5">
                                <span className="h-3 w-3 rounded-full bg-emerald-400" />
                                <span className="text-base font-bold text-white">
                                  {teamB?.name || 'Team B'}
                                </span>
                              </div>
                              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold">
                                INSTANCE BRAVO
                              </span>
                            </div>

                            {/* Team Code */}
                            <div className="flex justify-between items-center bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                              <div>
                                <span className="text-[10px] text-slate-400 block font-semibold">TEAM CODE (Teams Login)</span>
                                <span className="text-sm font-black text-cyan-400 font-mono tracking-wider">
                                  {teamB?.team_code || '------'}
                                </span>
                              </div>
                              <button
                                onClick={() => copyToClipboard(teamB?.team_code, `${game.id}-teamB-code`)}
                                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 border border-slate-700 cursor-pointer"
                              >
                                {copiedKey === `${game.id}-teamB-code` ? '✓ Copied' : 'Copy'}
                              </button>
                            </div>

                            {/* Bridge Code */}
                            <div className="flex justify-between items-center bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                              <div>
                                <span className="text-[10px] text-slate-400 block font-semibold">BRIDGE CODE (Bridge Login)</span>
                                <span className="text-sm font-black text-emerald-400 font-mono tracking-wider">
                                  {teamB?.bridge_code || '------'}
                                </span>
                              </div>
                              <button
                                onClick={() => copyToClipboard(teamB?.bridge_code, `${game.id}-teamB-bridge`)}
                                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 border border-slate-700 cursor-pointer"
                              >
                                {copiedKey === `${game.id}-teamB-bridge` ? '✓ Copied' : 'Copy'}
                              </button>
                            </div>

                            {/* System URL */}
                            <div className="flex justify-between items-center bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                              <div>
                                <span className="text-[10px] text-slate-400 block font-semibold">SYSTEM URL PATH</span>
                                <span className="text-xs text-slate-300 font-mono">
                                  {teamB?.instance_url || `/system/b-${game.id.substring(0, 6)}`}
                                </span>
                              </div>
                              <button
                                onClick={() => copyToClipboard(teamB?.instance_url, `${game.id}-teamB-url`)}
                                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 border border-slate-700 cursor-pointer"
                              >
                                {copiedKey === `${game.id}-teamB-url` ? '✓ Copied' : 'Copy'}
                              </button>
                            </div>

                            {/* Credentials & Password Format Peek */}
                            <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-[10px] text-slate-500 uppercase block">USERNAME</span>
                                <span className="text-slate-300 font-bold font-mono">{teamB?.system_username || 'user_demo'}</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-500 uppercase block">INITIAL PASSWORD</span>
                                <span className="text-amber-400 font-bold font-mono">{teamB?.system_password || 'eagle3#'}</span>
                                {teamB?.password_category && (
                                  <span className="text-[9px] text-slate-400 block mt-0.5">
                                    Category: <strong className="text-emerald-300">{teamB.password_category}</strong>
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Stego Fragment peek */}
                            {teamStates[teamB?.id] && (
                              <div className="p-2 rounded bg-slate-900/30 border border-slate-800 text-[11px] text-slate-400">
                                <span className="text-slate-500">L4 Stego Password: </span>
                                <span className="text-emerald-300 font-bold font-mono">{teamStates[teamB.id]?.endpoint_password}</span>
                                {teamStates[teamB.id]?.target_folder && (
                                  <span className="text-slate-500 text-[10px] ml-1">({teamStates[teamB.id]?.target_folder} folder)</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* LIVE TRACKING CHECKLIST PER TEAM */}
                        <div className="space-y-4 pt-2 border-t border-slate-800/80">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                              ⚡ 5-LAYER PENETRATION STATUS & TIME LOGS
                            </span>
                            <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-bold">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                              REALTIME SYNCED
                            </span>
                          </div>

                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                            {/* TEAM A ATTACK PROGRESS TOWARDS TEAM B */}
                            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 space-y-3">
                              <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-800">
                                <span className="font-bold text-cyan-400">{teamA?.name || 'Team A'} Vector</span>
                                <span className="text-slate-500 text-[11px]">Attacking Target: {teamB?.name || 'Team B'}</span>
                              </div>

                              <div className="space-y-2">
                                {LAYER_DEFINITIONS.map(layerDef => {
                                  const progList = layerProgress[teamA?.id] || [];
                                  const cur = progList.find(p => Number(p.layer_number) === Number(layerDef.number)) || {
                                    started_at: null,
                                    completed_at: null,
                                    duration_seconds: null
                                  };

                                  const isCompleted = Boolean(cur.completed_at);
                                  const isInProgress = Boolean(cur.started_at && !cur.completed_at);
                                  const durationStr = formatLayerDuration(cur);

                                  return (
                                    <div
                                      key={`game-${game.id}-teamA-l-${layerDef.number}`}
                                      className={`p-2.5 rounded-lg border text-xs flex items-center justify-between transition-all ${
                                        isCompleted
                                          ? 'bg-emerald-950/30 border-emerald-500/50 text-slate-200'
                                          : isInProgress
                                          ? 'bg-amber-950/30 border-amber-500/50 text-slate-200 animate-pulse'
                                          : 'bg-slate-900/40 border-slate-800/60 text-slate-500'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2.5">
                                        <span className="text-sm select-none">
                                          {isCompleted ? '✅' : isInProgress ? '⏳' : '❌'}
                                        </span>
                                        <div>
                                          <div className="font-bold text-slate-300">
                                            L{layerDef.number}: {layerDef.name}
                                          </div>
                                          <div className="text-[10px] text-slate-500">{layerDef.desc}</div>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-2.5">
                                        {isCompleted && (
                                          <span className="text-[11px] font-bold text-emerald-400 font-mono">
                                            {durationStr}
                                          </span>
                                        )}
                                        <button
                                          onClick={() => teamA && handleToggleLayer(game.id, teamA.id, layerDef.number)}
                                          title="Admin simulation toggle"
                                          className="px-2 py-0.5 rounded text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 cursor-pointer"
                                        >
                                          Advance
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* TEAM B ATTACK PROGRESS TOWARDS TEAM A */}
                            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 space-y-3">
                              <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-800">
                                <span className="font-bold text-emerald-400">{teamB?.name || 'Team B'} Vector</span>
                                <span className="text-slate-500 text-[11px]">Attacking Target: {teamA?.name || 'Team A'}</span>
                              </div>

                              <div className="space-y-2">
                                {LAYER_DEFINITIONS.map(layerDef => {
                                  const progList = layerProgress[teamB?.id] || [];
                                  const cur = progList.find(p => Number(p.layer_number) === Number(layerDef.number)) || {
                                    started_at: null,
                                    completed_at: null,
                                    duration_seconds: null
                                  };

                                  const isCompleted = Boolean(cur.completed_at);
                                  const isInProgress = Boolean(cur.started_at && !cur.completed_at);
                                  const durationStr = formatLayerDuration(cur);

                                  return (
                                    <div
                                      key={`game-${game.id}-teamB-l-${layerDef.number}`}
                                      className={`p-2.5 rounded-lg border text-xs flex items-center justify-between transition-all ${
                                        isCompleted
                                          ? 'bg-emerald-950/30 border-emerald-500/50 text-slate-200'
                                          : isInProgress
                                          ? 'bg-amber-950/30 border-amber-500/50 text-slate-200 animate-pulse'
                                          : 'bg-slate-900/40 border-slate-800/60 text-slate-500'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2.5">
                                        <span className="text-sm select-none">
                                          {isCompleted ? '✅' : isInProgress ? '⏳' : '❌'}
                                        </span>
                                        <div>
                                          <div className="font-bold text-slate-300">
                                            L{layerDef.number}: {layerDef.name}
                                          </div>
                                          <div className="text-[10px] text-slate-500">{layerDef.desc}</div>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-2.5">
                                        {isCompleted && (
                                          <span className="text-[11px] font-bold text-emerald-400 font-mono">
                                            {durationStr}
                                          </span>
                                        )}
                                        <button
                                          onClick={() => teamB && handleToggleLayer(game.id, teamB.id, layerDef.number)}
                                          title="Admin simulation toggle"
                                          className="px-2 py-0.5 rounded text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 cursor-pointer"
                                        >
                                          Advance
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                          </div>
                        </div>

                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ==================== 4. ANTI-CHEAT FORFEIT NOTIFICATIONS ==================== */}
        <section className="rounded-2xl border border-red-900/60 bg-slate-950/90 p-5 sm:p-6 space-y-4 shadow-xl shadow-red-950/20">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-red-950/80 pb-4">
            <div className="flex items-center gap-3">
              <span className="text-xl">🚨</span>
              <div>
                <h3 className="text-base sm:text-lg font-black text-red-500 tracking-wide uppercase">
                  INTEGRITY SUPERVISOR // DEVTOOLS FORFEIT NOTIFICATIONS
                </h3>
                <p className="text-xs text-red-400/80">
                  Realtime tracking of disqualified participants who violated anti-cheat inspect guidelines
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-[10px] bg-red-950 text-red-400 border border-red-800 font-bold uppercase">
                {forfeitEvents.length} VIOLATION{forfeitEvents.length === 1 ? '' : 'S'}
              </span>
              {forfeitEvents.length > 0 && (
                <button
                  onClick={() => setForfeitEvents([])}
                  className="text-[10px] text-slate-500 hover:text-slate-300 underline cursor-pointer"
                >
                  Clear Feed
                </button>
              )}
            </div>
          </div>

          {forfeitEvents.length === 0 ? (
            <div className="p-8 text-center bg-slate-900/30 rounded-xl border border-slate-900">
              <div className="text-2xl text-emerald-500 mb-1">🛡️</div>
              <div className="text-xs font-bold text-slate-300">Clean Tournament Record</div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                No DevTools violation or automatic forfeit events recorded across any active match.
              </div>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {forfeitEvents.map((evt) => (
                <div
                  key={evt.id}
                  className="p-3.5 rounded-xl bg-red-950/30 border border-red-600/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md shadow-red-950/30"
                >
                  <div className="flex items-start sm:items-center gap-3">
                    <span className="text-red-500 font-black text-sm">⚠</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-xs">{evt.teamName}</span>
                        <span className="text-[10px] text-slate-400 font-mono">({evt.gameName})</span>
                        <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-red-600 text-white shadow-sm">
                          FORFEIT - DevTools Detected
                        </span>
                      </div>
                      <div className="text-[11px] text-red-300/90 mt-0.5">
                        Violation trigger: <span className="font-mono font-bold">{evt.reason}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-400 font-mono shrink-0 self-end sm:self-center">
                    {new Date(evt.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* FOOTER AUDIT LOG */}
        <footer className="pt-6 border-t border-slate-900 text-[11px] text-slate-600 flex flex-col sm:flex-row justify-between items-center gap-2">
          <div className="flex items-center gap-2">
            <span>TRAZ CTF PLATFORM // COMMAND SURFACE v3.0</span>
          </div>
          <div className="flex gap-4 font-mono">
            <span>SECURE MATRIX</span>
            <span>CASCADE PURGE ENABLED</span>
            <span>REALTIME REPLICATION</span>
          </div>
        </footer>

      </div>
    </div>
  );
}
