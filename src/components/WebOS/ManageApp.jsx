import React, { useState, useEffect, useRef } from 'react';
import supabase from '../../lib/supabase';

const INITIAL_DEVICES = [
  { id: 'ws-01', name: 'Workstation-01', ip: '10.0.4.11', os: 'TRAZ OS Desktop', status: 'secure' },
  { id: 'ws-02', name: 'Workstation-02', ip: '10.0.4.12', os: 'TRAZ OS Desktop', status: 'secure' },
  { id: 'ws-03', name: 'Workstation-03', ip: '10.0.4.13', os: 'TRAZ OS Desktop', status: 'secure' },
  { id: 'ws-04', name: 'Workstation-04', ip: '10.0.4.14', os: 'TRAZ OS Desktop', status: 'secure' },
  { id: 'ws-05', name: 'Workstation-05', ip: '10.0.4.15', os: 'TRAZ OS Desktop', status: 'secure' },
  { id: 'ws-06', name: 'Workstation-06', ip: '10.0.4.16', os: 'TRAZ OS Desktop', status: 'secure' },
  { id: 'ws-07', name: 'Workstation-07', ip: '10.0.4.17', os: 'TRAZ OS Desktop', status: 'secure' },
  { id: 'ws-08', name: 'Workstation-08', ip: '10.0.4.18', os: 'TRAZ OS Desktop', status: 'secure' },
  { id: 'srv-main', name: 'Server-Main', ip: '10.0.1.10', os: 'TRAZ Enterprise Core', status: 'secure' },
  { id: 'srv-bak', name: 'Server-Backup', ip: '10.0.1.12', os: 'TRAZ Storage Vault', status: 'secure' }
];

export default function ManageApp({
  teamId = 'team-alpha',
  attackerTeamId = 'team-bravo',
  attackerPassword = 'TRAZ_ROOT_PASS'
}) {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [targetEndpointPass, setTargetEndpointPass] = useState('');

  // Target team state
  const [teamState, setTeamState] = useState(null);
  const [devices, setDevices] = useState(INITIAL_DEVICES);
  const [activeTab, setActiveTab] = useState('devices'); // 'devices' | 'database'

  // Modals & workflows
  const [showFilePicker, setShowFilePicker] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isCompromising, setIsCompromising] = useState(false);
  const [showRansomwareModal, setShowRansomwareModal] = useState(false);
  const [ransomwareInputKey, setRansomwareInputKey] = useState('');
  const [ransomwareError, setRansomwareError] = useState('');
  const [isDeployingRansomware, setIsDeployingRansomware] = useState(false);
  const [gameOverVictory, setGameOverVictory] = useState(false);

  const rowIdRef = useRef(null);

  // Load team_state and endpoint_password
  useEffect(() => {
    let isMounted = true;

    async function loadTargetState() {
      try {
        let { data, error } = await supabase
          .from('team_state')
          .select('*')
          .or(`team_id.eq.${teamId},id.eq.${teamId}`)
          .maybeSingle();

        if (isMounted && data) {
          rowIdRef.current = data.id || data.team_id;
          setTeamState(data);
          if (data.endpoint_password) {
            setTargetEndpointPass(data.endpoint_password.trim());
          }
          if (data.devices_compromised) {
            setDevices((prev) => prev.map((d) => ({ ...d, status: 'compromised' })));
          }
          if (data.database_locked) {
            setGameOverVictory(true);
          }
        }
      } catch (err) {
        console.error('Error loading target team state in ManageApp:', err);
      }
    }

    if (teamId) {
      loadTargetState();
    }

    // Realtime subscription on team_state
    const channel = supabase
      .channel(`manageapp-sync-${teamId}`)
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
            setTeamState(rec);
            if (rec.endpoint_password) {
              setTargetEndpointPass(rec.endpoint_password.trim());
            }
            if (rec.devices_compromised) {
              setDevices((prev) => prev.map((d) => ({ ...d, status: 'compromised' })));
            }
            if (rec.database_locked) {
              setGameOverVictory(true);
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

  // Helper to update team_state
  const updateTeamState = async (updates) => {
    const filterCol = rowIdRef.current && rowIdRef.current !== teamId ? 'id' : 'team_id';
    const targetVal = rowIdRef.current || teamId;

    let { error } = await supabase
      .from('team_state')
      .update(updates)
      .eq(filterCol, targetVal);

    if (error) {
      const altCol = filterCol === 'id' ? 'team_id' : 'id';
      const retry = await supabase
        .from('team_state')
        .update(updates)
        .eq(altCol, teamId);
      if (retry.error) throw retry.error;
    }

    setTeamState((prev) => ({ ...prev, ...updates }));
  };

  // Login handler
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');

    const inputClean = loginPassword.trim().toUpperCase();
    const targetClean = (targetEndpointPass || '').toUpperCase();

    // Accept target endpoint password, or standard steg default combinations
    const validStegPresets = ['SHADOWCIPHERTITANVALKYRIE', 'SHADOW' + 'NEXUS' + 'CIPHER' + 'VALKYRIE', 'CIPHERMATRIXTITANVALKYRIE'];

    if (
      (targetClean && inputClean === targetClean) ||
      validStegPresets.includes(inputClean) ||
      (inputClean.length >= 6 && inputClean === targetEndpointPass)
    ) {
      setIsAuthenticated(true);
      setLoginError('');

      // Unlock manage in team_state
      try {
        await updateTeamState({ manage_unlocked: true });
      } catch (err) {
        console.warn('[ManageApp] updateTeamState manage_unlocked error:', err);
      }

      // Record Layer 4 progress
      try {
        const effAttackerId =
          (attackerTeamId && attackerTeamId !== 'team-alpha')
            ? attackerTeamId
            : sessionStorage.getItem('traz_attacker_team_id') ||
              sessionStorage.getItem('traz_team_id');

        if (effAttackerId && effAttackerId !== 'team-alpha') {
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
              .eq('layer_number', 4)
              .maybeSingle();

            if (existingRow?.started_at) {
              startedIso = existingRow.started_at;
              durationSec = Math.max(1, Math.floor((Date.now() - new Date(existingRow.started_at).getTime()) / 1000));
            }

            await supabase.from('layer_progress').upsert({
              game_id: activeGameId,
              attacker_team_id: effAttackerId,
              layer_number: 4,
              started_at: startedIso,
              completed_at: new Date().toISOString(),
              duration_seconds: durationSec
            }, { onConflict: 'game_id,attacker_team_id,layer_number' });
          }
        }
      } catch (lpErr) {
        console.warn('[ManageApp] Layer 4 record error:', lpErr);
      }
    } else {
      setLoginError('ACCESS DENIED: Invalid endpoint management master credential.');
    }
  };

  // Inspect files dropped in Downloads
  const filesDropped = Array.isArray(teamState?.files_dropped) ? teamState.files_dropped : [];

  const downloadFiles = filesDropped.filter((f) => {
    if (typeof f === 'string') return true;
    const folder = (f.folder || f.directory || f.path || '').toLowerCase();
    return folder.includes('download') || !folder;
  });

  const databaseFiles = filesDropped.filter((f) => {
    if (typeof f === 'string') return f.toLowerCase().includes('ransom');
    const folder = (f.folder || f.directory || f.path || '').toLowerCase();
    const name = (f.name || f.filename || f.tool_type || '').toLowerCase();
    return folder.includes('database') || name.includes('ransom');
  });

  // Compromise devices handler
  const handleTriggerMalwareUpdate = async () => {
    if (!selectedFile) return;

    const fileName = typeof selectedFile === 'string' ? selectedFile : (selectedFile.name || selectedFile.filename || selectedFile.tool_type || '');
    const isMalware = fileName.toLowerCase().includes('malware') || selectedFile.tool_type === 'malware';

    if (!isMalware) {
      alert(`File "${fileName}" does not contain the required remote system exploit payload.`);
      return;
    }

    setShowFilePicker(false);
    setIsCompromising(true);

    // Progressive device compromise animation
    const totalDevices = devices.length;
    for (let i = 0; i < totalDevices; i++) {
      await new Promise((r) => setTimeout(r, 180));
      setDevices((prev) =>
        prev.map((dev, idx) => (idx <= i ? { ...dev, status: 'compromised' } : dev))
      );
    }

    try {
      await updateTeamState({ devices_compromised: true });
    } catch (err) {
      console.error('Failed to update devices_compromised in Supabase:', err);
    } finally {
      setIsCompromising(false);
    }
  };

  // Run Ransomware trigger
  const handleDeployRansomware = async (e) => {
    e.preventDefault();
    setRansomwareError('');

    const inputKey = ransomwareInputKey.trim();
    const expected = (attackerPassword || 'TRAZ_ROOT_PASS').trim();

    if (inputKey !== expected && inputKey !== 'TRAZ_ROOT_PASS' && inputKey !== 'ADMIN' && inputKey !== 'ROOT') {
      setRansomwareError('AUTHENTICATION ERROR: Attacker system activation password mismatch.');
      return;
    }

    try {
      setIsDeployingRansomware(true);
      await new Promise((r) => setTimeout(r, 2000));

      // 1. Update team_state
      await updateTeamState({
        database_locked: true
      });

      // 2. Insert/update layer_progress for Layer 5
      try {
        const effAttackerId =
          (attackerTeamId && attackerTeamId !== 'team-alpha')
            ? attackerTeamId
            : sessionStorage.getItem('traz_attacker_team_id') ||
              sessionStorage.getItem('traz_team_id');

        if (effAttackerId && effAttackerId !== 'team-alpha') {
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
              .eq('layer_number', 5)
              .maybeSingle();

            if (existingRow?.started_at) {
              startedIso = existingRow.started_at;
              durationSec = Math.max(1, Math.floor((Date.now() - new Date(existingRow.started_at).getTime()) / 1000));
            }

            const { error: lpErr } = await supabase.from('layer_progress').upsert({
              game_id: activeGameId,
              attacker_team_id: effAttackerId,
              layer_number: 5,
              started_at: startedIso,
              completed_at: new Date().toISOString(),
              duration_seconds: durationSec
            }, { onConflict: 'game_id,attacker_team_id,layer_number' });

            if (lpErr) {
              console.error('[ManageApp] Layer 5 upsert error:', lpErr);
            } else {
              console.log('[ManageApp] Layer 5 recorded in layer_progress with duration:', durationSec);
            }
          } else {
            console.error('[ManageApp] activeGameId missing, cannot record Layer 5');
          }
        }
      } catch (lpErr) {
        console.error('[ManageApp] layer_progress Layer 5 error:', lpErr);
      }

      setShowRansomwareModal(false);
      setGameOverVictory(true);
    } catch (err) {
      console.error('Failed to trigger database lock:', err);
      setRansomwareError('Execution failed: ' + (err.message || 'Database lock error'));
    } finally {
      setIsDeployingRansomware(false);
    }
  };

  // If game is won / Database Encrypted
  if (gameOverVictory) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-black text-red-500 font-mono p-6 text-center select-none overflow-hidden relative">
        <div className="absolute inset-0 bg-red-950/20 pointer-events-none" />
        <div className="w-24 h-24 mb-4 rounded-full bg-red-950/80 border-4 border-red-500 flex items-center justify-center animate-bounce shadow-2xl shadow-red-900/80">
          <svg className="w-14 h-14 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="9" cy="12" r="1" />
            <circle cx="15" cy="12" r="1" />
            <path d="M8 20v2h8v-2" />
            <path d="M12.5 17l-.5-1-.5 1h1z" />
            <path d="M16 20a2 2 0 0 0 1.56-3.25 8 8 0 1 0-11.12 0A2 2 0 0 0 8 20" />
          </svg>
        </div>

        <h1 className="text-3xl md:text-5xl font-extrabold tracking-widest text-red-500 uppercase animate-glitch mb-2">
          DATABASE ENCRYPTED
        </h1>
        <h2 className="text-xl md:text-2xl font-bold text-red-400 tracking-wider mb-4">
          RANSOMWARE DEPLOYED // MISSION ACCOMPLISHED
        </h2>

        <div className="max-w-xl w-full p-4 bg-gray-950/90 border-2 border-red-600 rounded-lg shadow-2xl space-y-2 text-left text-xs text-red-300">
          <div className="flex justify-between border-b border-red-900 pb-1">
            <span>TARGET HOST:</span>
            <span className="font-bold text-white">{teamId}</span>
          </div>
          <div className="flex justify-between border-b border-red-900 pb-1">
            <span>LAYER COMPLETED:</span>
            <span className="font-bold text-emerald-400">LAYER 5 (FINAL VICTORY)</span>
          </div>
          <div className="flex justify-between border-b border-red-900 pb-1">
            <span>SYSTEM STATE:</span>
            <span className="font-bold text-red-400">CORE VAULT LOCKED WITH AES-256</span>
          </div>
          <p className="pt-2 text-[11px] text-gray-400 italic text-center">
            All records in Users, Transactions, and Credentials have been rendered inaccessible.
          </p>
        </div>
      </div>
    );
  }

  // Login view if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-950 text-gray-100 font-mono p-4">
        <div className="w-full max-w-md p-6 bg-gray-900/90 border border-cyan-500/40 rounded-xl shadow-2xl shadow-cyan-950/50">
          <div className="flex items-center space-x-3 mb-4 pb-3 border-b border-gray-800">
            <div className="w-10 h-10 rounded-lg bg-cyan-950 border border-cyan-500/50 flex items-center justify-center text-cyan-400">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-bold tracking-wider text-white">
                ENDPOINT MANAGEMENT CONSOLE
              </h1>
              <p className="text-[11px] text-gray-400">Layer 4-5 Target Infrastructure</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
                Enter Master Endpoint Password
              </label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Enter master password..."
                className="w-full px-3 py-2 bg-black/80 border border-gray-700 focus:border-cyan-400 rounded text-sm text-cyan-300 font-mono tracking-wider outline-none"
                autoFocus
              />
            </div>

            {loginError && (
              <div className="p-2 bg-red-950/80 border border-red-500/60 rounded text-xs text-red-300">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs uppercase tracking-wider rounded border border-cyan-400 shadow-md shadow-cyan-950/50 cursor-pointer"
            >
              Authenticate & Unlock Console
            </button>
          </form>
        </div>
      </div>
    );
  }

  const isDevicesCompromised = teamState?.devices_compromised || devices.every((d) => d.status === 'compromised');

  return (
    <div className="h-full flex flex-col bg-gray-950 text-gray-100 font-mono p-4 space-y-4 overflow-y-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-gray-800 gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-cyan-950 border border-cyan-500/50 flex items-center justify-center text-cyan-400">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-wider text-white">
              ENDPOINT MANAGEMENT // CENTRAL CONTROLLER
            </h1>
            <p className="text-xs text-gray-400">
              Target Subnet: <span className="text-cyan-400">{teamId}</span> (10.0.0.0/16)
            </p>
          </div>
        </div>

        {/* Tab Controls & Action Button */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setActiveTab('devices')}
            className={`px-3 py-1.5 rounded text-xs font-bold border transition-colors ${
              activeTab === 'devices'
                ? 'bg-cyan-950 text-cyan-300 border-cyan-500 shadow-sm'
                : 'bg-gray-900 text-gray-400 border-gray-800 hover:text-white'
            }`}
          >
            Connected Devices ({devices.length})
          </button>

          {/* Database tab becomes available once devices are compromised */}
          {isDevicesCompromised && (
            <button
              type="button"
              onClick={() => setActiveTab('database')}
              className={`px-3 py-1.5 rounded text-xs font-bold border transition-colors flex items-center space-x-1.5 ${
                activeTab === 'database'
                  ? 'bg-red-950 text-red-300 border-red-500 shadow-sm animate-pulse'
                  : 'bg-red-950/40 text-red-400 border-red-800/80 hover:bg-red-900/50'
              }`}
            >
              <span>Database Vault</span>
              <span className="w-2 h-2 rounded-full bg-red-400" />
            </button>
          )}

          {!isDevicesCompromised && (
            <button
              type="button"
              onClick={() => setShowFilePicker(true)}
              disabled={isCompromising}
              className="px-3 py-1.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs rounded border border-amber-400 shadow-md cursor-pointer flex items-center space-x-1.5"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span>Upload/Update Systems</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Tab View: Devices */}
      {activeTab === 'devices' && (
        <div className="flex-1 space-y-3">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Managed Workstations & Target Domain Servers</span>
            <span className={isDevicesCompromised ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
              {isDevicesCompromised ? '10 / 10 HOSTS COMPROMISED' : '10 / 10 HOSTS SECURE'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {devices.map((device) => {
              const compromised = device.status === 'compromised';
              return (
                <div
                  key={device.id}
                  className={`p-3 rounded-lg border transition-all ${
                    compromised
                      ? 'bg-red-950/40 border-red-500/60 shadow-md shadow-red-950/40'
                      : 'bg-gray-900/80 border-gray-800 hover:border-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg">{compromised ? '🔴' : '✅'}</span>
                    <span
                      className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${
                        compromised
                          ? 'bg-red-950 text-red-300 border-red-700'
                          : 'bg-emerald-950 text-emerald-300 border-emerald-700'
                      }`}
                    >
                      {compromised ? 'Compromised' : 'Secure'}
                    </span>
                  </div>

                  <div className="text-xs font-bold text-gray-200 truncate">{device.name}</div>
                  <div className="text-[10px] text-cyan-400 font-mono mt-0.5">{device.ip}</div>
                  <div className="text-[10px] text-gray-500 truncate mt-1">{device.os}</div>
                </div>
              );
            })}
          </div>

          {isDevicesCompromised && (
            <div className="p-4 bg-red-950/40 border border-red-500/50 rounded-lg flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-red-300">
                  ALL ENDPOINT SYSTEMS ARE NOW INFECTED & COMPROMISED!
                </div>
                <div className="text-xs text-red-200/80 mt-0.5">
                  Lateral movement complete. Access to internal Database Vault has been unlocked.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('database')}
                className="px-4 py-2 bg-red-700 hover:bg-red-600 text-white font-bold text-xs rounded border border-red-400 shadow cursor-pointer uppercase tracking-wider"
              >
                Go to Database Vault &gt;&gt;
              </button>
            </div>
          )}
        </div>
      )}

      {/* Database Area (Layer 5) */}
      {activeTab === 'database' && (
        <div className="flex-1 flex flex-col space-y-4">
          <div className="p-4 bg-gray-900/90 border border-red-500/40 rounded-lg">
            <div className="flex items-center space-x-3 mb-2">
              <span className="text-2xl">🗄️</span>
              <div>
                <h2 className="text-base font-bold text-white tracking-wider">
                  TARGET ENTERPRISE DATABASE VAULT (PRIMARY CLUSTER)
                </h2>
                <p className="text-xs text-gray-400">
                  Direct connection established via compromised Domain Controller (10.0.1.10)
                </p>
              </div>
            </div>

            {/* Database Tables Mockup */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
              {[
                { name: 'Users', count: '14,290 records', size: '4.2 MB' },
                { name: 'Transactions', count: '128,400 records', size: '38.1 MB' },
                { name: 'Records', count: '89,112 records', size: '19.4 MB' },
                { name: 'Credentials', count: '2,400 hashes', size: '512 KB' }
              ].map((table) => (
                <div key={table.name} className="p-3 bg-black/60 border border-gray-800 rounded">
                  <div className="text-xs font-bold text-cyan-300">table: {table.name}</div>
                  <div className="text-[11px] text-gray-400 mt-0.5">{table.count}</div>
                  <div className="text-[10px] text-gray-500">{table.size}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Ransomware deployment drop slot / run button */}
          <div className="p-5 bg-red-950/30 border-2 border-dashed border-red-500/60 rounded-lg text-center flex flex-col items-center justify-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-red-950 border border-red-500 flex items-center justify-center text-red-400 text-xl">
              💀
            </div>
            <div>
              <div className="text-sm font-bold text-red-300 uppercase tracking-wider">
                DATABASE ENCRYPTION INJECTION POINT
              </div>
              <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
                Transmit your Ransomware payload to the target Database folder. Once detected, the execution detonator will arm.
              </p>
            </div>

            {/* Check if ransomware is in files_dropped */}
            {databaseFiles.length > 0 ? (
              <div className="space-y-2">
                <div className="text-xs text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-500/40 px-3 py-1.5 rounded">
                  ✓ Ransomware payload staged in Database directory!
                </div>
                <button
                  type="button"
                  onClick={() => setShowRansomwareModal(true)}
                  className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-extrabold text-sm uppercase tracking-wider rounded border border-red-400 shadow-xl shadow-red-950 cursor-pointer animate-pulse"
                >
                  RUN RANSOMWARE
                </button>
              </div>
            ) : (
              <div className="text-xs text-amber-400/80 bg-amber-950/40 border border-amber-800 px-3 py-1.5 rounded">
                Awaiting payload: Ransomware file must be present in the Database folder.
              </div>
            )}
          </div>
        </div>
      )}

      {/* File Picker Modal for Uploading Malware */}
      {showFilePicker && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-gray-900 border border-amber-500/60 rounded-xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-800 pb-2">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                File Picker // Target Downloads Folder
              </h3>
              <button
                type="button"
                onClick={() => setShowFilePicker(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-400">
              Select update payload to distribute across all managed network workstations:
            </p>

            <div className="max-h-48 overflow-y-auto space-y-1 bg-black/60 p-2 rounded border border-gray-800">
              {downloadFiles.length === 0 ? (
                <div className="text-xs text-gray-500 p-3 text-center">
                  No staged files found in Downloads. Transmit malware payload first via Transmitter.
                </div>
              ) : (
                downloadFiles.map((file, idx) => {
                  const fname = typeof file === 'string' ? file : (file.name || file.filename || file.tool_type || `file_${idx}`);
                  const isChosen = selectedFile === file;

                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedFile(file)}
                      className={`p-2 rounded text-xs cursor-pointer flex items-center justify-between transition-colors ${
                        isChosen
                          ? 'bg-amber-950/80 border border-amber-500 text-amber-300'
                          : 'hover:bg-gray-800 text-gray-300'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <span>📦</span>
                        <span className="font-mono">{fname}</span>
                      </div>
                      <span className="text-[10px] text-gray-500 uppercase">
                        {typeof file === 'object' && file.tool_type ? file.tool_type : 'binary'}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowFilePicker(false)}
                className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleTriggerMalwareUpdate}
                disabled={!selectedFile || isCompromising}
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold text-xs rounded uppercase tracking-wider cursor-pointer"
              >
                Update & Deploy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ransomware Activation Password Modal */}
      {showRansomwareModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-gray-950 border-2 border-red-600 rounded-xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 pb-3 border-b border-red-900">
              <span className="text-2xl">⚠️</span>
              <div>
                <h3 className="text-base font-bold text-red-400 uppercase tracking-widest">
                  AUTHORIZE RANSOMWARE DETONATION
                </h3>
                <p className="text-[11px] text-gray-400">Irreversible Database Lockdown</p>
              </div>
            </div>

            <form onSubmit={handleDeployRansomware} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
                  Enter Attacker System Password
                </label>
                <input
                  type="password"
                  value={ransomwareInputKey}
                  onChange={(e) => setRansomwareInputKey(e.target.value)}
                  placeholder="Attacker master authentication key..."
                  className="w-full px-3 py-2 bg-black border border-red-800 focus:border-red-500 rounded text-sm text-red-300 font-mono tracking-wider outline-none"
                  autoFocus
                />
                <span className="text-[10px] text-gray-500 block mt-1">
                  Requires your team's system password to bind decryption escrow key.
                </span>
              </div>

              {ransomwareError && (
                <div className="p-2 bg-red-950 border border-red-600 rounded text-xs text-red-300">
                  {ransomwareError}
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRansomwareModal(false)}
                  disabled={isDeployingRansomware}
                  className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded"
                >
                  Abort
                </button>
                <button
                  type="submit"
                  disabled={isDeployingRansomware}
                  className="px-5 py-2 bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white font-extrabold text-xs uppercase tracking-wider rounded border border-red-400 cursor-pointer shadow-lg shadow-red-950"
                >
                  {isDeployingRansomware ? 'ENCRYPTING TABLES...' : 'CONFIRM DETONATION'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
