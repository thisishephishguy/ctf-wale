import React, { useState, useEffect } from 'react';
import supabase from '../../lib/supabase';

const TOOLS = [
  {
    id: 'cracker',
    name: 'Cracker',
    desc: 'Unlocks applications.',
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 9.9-1" />
      </svg>
    )
  },
  {
    id: 'malware',
    name: 'Malware',
    desc: 'Compromises devices.',
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="8" y="9" width="8" height="10" rx="4" />
        <path d="M6 13H2M22 13h-4M6 17l-4 2M22 19l-4-2M6 9L2 7M22 7l-4 2M9 5a3 3 0 0 1 6 0" />
      </svg>
    )
  },
  {
    id: 'ransomware',
    name: 'Ransomware',
    desc: 'Encrypts database.',
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="9" cy="12" r="1.5" />
        <circle cx="15" cy="12" r="1.5" />
        <path d="M8 20v2h8v-2M10 16h4M12 2a9 9 0 0 0-9 9c0 3.1 1.6 5.8 4 7.3V20a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1.7c2.4-1.5 4-4.2 4-7.3a9 9 0 0 0-9-9z" />
      </svg>
    )
  }
];

export default function Transmitter({ attackerTeamId = '', targetTeamId = '' }) {
  const [selectedTool, setSelectedTool] = useState('cracker');
  const [targetIP, setTargetIP] = useState('');
  const [transmissionState, setTransmissionState] = useState('idle'); // idle | connecting | checking | transmitting | success | blocked | error
  const [statusMessage, setStatusMessage] = useState('');
  const [progress, setProgress] = useState(0);
  const [resolvedTargetId, setResolvedTargetId] = useState(targetTeamId);

  // Dynamically resolve target team ID from Supabase if prop is fallback or empty
  useEffect(() => {
    let isMounted = true;
    async function resolveTarget() {
      if (targetTeamId && targetTeamId !== 'team-bravo' && targetTeamId !== 'team-alpha') {
        if (isMounted) setResolvedTargetId(targetTeamId);
        return;
      }
      const myId = attackerTeamId || sessionStorage.getItem('traz_team_id') || sessionStorage.getItem('traz_attacker_team_id');
      if (myId) {
        const { data: myTeam } = await supabase
          .from('teams')
          .select('opponent_id')
          .eq('id', myId)
          .maybeSingle();
        if (isMounted && myTeam?.opponent_id) {
          setResolvedTargetId(myTeam.opponent_id);
          return;
        }

        const { data: oppTeam } = await supabase
          .from('teams')
          .select('id')
          .eq('opponent_id', myId)
          .maybeSingle();
        if (isMounted && oppTeam?.id) {
          setResolvedTargetId(oppTeam.id);
        }
      }
    }
    resolveTarget();
    return () => {
      isMounted = false;
    };
  }, [attackerTeamId, targetTeamId]);

  const calculateTargetIP = (id) => {
    const safeId = String(id || 'traz');
    const c0 = safeId.charCodeAt(0) || 65;
    const c1 = safeId.length > 1 ? safeId.charCodeAt(1) : 66;
    return `10.0.${c0 % 256}.${c1 % 256}`;
  };

  const effectiveTargetId = resolvedTargetId || targetTeamId;
  const expectedTargetIP = calculateTargetIP(effectiveTargetId);

  const handleTransmit = async () => {
    if (!targetIP.trim()) {
      setTransmissionState('error');
      setStatusMessage('ERROR: Target IP address cannot be empty.');
      return;
    }

    if (targetIP.trim() !== expectedTargetIP) {
      setTransmissionState('error');
      setStatusMessage(`HOST UNREACHABLE: No node responding at ${targetIP.trim()}. Verify target node IP using 'hostname -I' in terminal.`);
      return;
    }

    // Step 1: Connecting
    setTransmissionState('connecting');
    setStatusMessage(`Establishing connection to node ${targetIP}...`);
    setProgress(15);

    await new Promise((r) => setTimeout(r, 600));

    // Step 2: Checking firewall
    setTransmissionState('checking');
    setStatusMessage('Probing perimeter security and firewall state...');
    setProgress(35);

    await new Promise((r) => setTimeout(r, 700));

    try {
      // Query target team_state for firewall_on
      const { data, error } = await supabase
        .from('team_state')
        .select('firewall_on, files_dropped')
        .eq('team_id', effectiveTargetId)
        .maybeSingle();

      if (error) {
        console.error('Error querying target team_state:', error);
        setTransmissionState('error');
        setStatusMessage(`DATABASE ERROR: ${error.message || 'Failed to query target state'}`);
        return;
      }

      if (!data) {
        setTransmissionState('error');
        setStatusMessage('ERROR: Target system state not found in database.');
        return;
      }

      const isFirewallActive = Boolean(data.firewall_on);

      if (isFirewallActive) {
        setTransmissionState('blocked');
        setStatusMessage('CONNECTION BLOCKED');
        setProgress(35);
        return;
      }

      // Step 3: Firewall is down -> Transmit payload with animated progress bar
      setTransmissionState('transmitting');
      setStatusMessage(`Transmitting payload [${selectedTool.toUpperCase()}] through breached gateway...`);

      // 2-3 second progress animation
      for (let p = 40; p <= 95; p += 15) {
        setProgress(p);
        await new Promise((r) => setTimeout(r, 250));
      }

      // Append to target team_state.files_dropped
      const existingDropped = Array.isArray(data?.files_dropped) ? data.files_dropped : [];
      const hasTool = existingDropped.some((item) => {
        const str = typeof item === 'string' ? item : item?.toolType || item?.name || '';
        return str.toLowerCase().includes(selectedTool.toLowerCase());
      });

      const updatedDropped = hasTool ? existingDropped : [...existingDropped, selectedTool];

      const { error: updateError } = await supabase
        .from('team_state')
        .update({ files_dropped: updatedDropped })
        .eq('team_id', effectiveTargetId);

      if (updateError) {
        console.error('Update team_state files_dropped error:', updateError);
        setTransmissionState('error');
        setStatusMessage(`PAYLOAD WRITE ERROR: ${updateError.message || 'Failed to drop file on target'}`);
        return;
      }

      setProgress(100);
      setTransmissionState('success');
      setStatusMessage(`SUCCESS: [${selectedTool.toUpperCase()}] delivered to target Downloads directory!`);
    } catch (err) {
      console.error('Transmission error:', err);
      setTransmissionState('error');
      setStatusMessage(`CRITICAL: Transmission aborted - ${err.message || 'Network failure'}`);
    }
  };

  return (
    <div className="h-full w-full bg-slate-950 text-gray-100 flex flex-col p-5 font-mono overflow-y-auto">
      {/* Header */}
      <div className="flex items-center space-x-3 pb-4 border-b border-red-900/40">
        <div className="w-10 h-10 rounded-lg bg-red-950/80 border border-red-500/50 flex items-center justify-center text-red-400 shadow-lg shadow-red-950/50">
          {/* Satellite / Antenna SVG Icon */}
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 11a9 9 0 0 1 9 9" />
            <path d="M4 4a16 16 0 0 1 16 16" />
            <circle cx="5" cy="19" r="1" fill="currentColor" />
            <line x1="12" y1="2" x2="8" y2="6" />
            <line x1="8" y1="2" x2="12" y2="6" />
          </svg>
        </div>
        <div>
          <h1 className="text-base font-bold tracking-widest text-red-400">
            TRANSMITTER // EXPLOIT STAGER
          </h1>
          <p className="text-xs text-gray-400 font-sans">
            Deploy weaponized cyber tools directly into target system storage.
          </p>
        </div>
      </div>

      {/* Tool Selection Grid */}
      <div className="mt-4">
        <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2 block">
          Select Weaponized Tool
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {TOOLS.map((t) => {
            const isSelected = selectedTool === t.id;
            return (
              <div
                key={t.id}
                onClick={() => {
                  if (transmissionState !== 'transmitting') setSelectedTool(t.id);
                }}
                className={`p-3 rounded-lg border cursor-pointer transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'bg-red-950/40 border-red-500 text-white shadow-md shadow-red-950/50 ring-1 ring-red-500/60'
                    : 'bg-black/40 border-gray-800 text-gray-400 hover:border-gray-700 hover:text-gray-200'
                }`}
              >
                <div className="flex items-center space-x-3 mb-2">
                  <div className={isSelected ? 'text-red-400' : 'text-gray-500'}>
                    {t.icon}
                  </div>
                  <span className="font-bold text-sm tracking-wide">{t.name}</span>
                </div>
                <p className="text-[11px] font-sans text-gray-400 leading-snug">
                  {t.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Target IP Input */}
      <div className="mt-5 bg-black/40 p-4 rounded-lg border border-red-950/60 space-y-3">
        <div className="flex flex-col space-y-1">
          <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
            Target Node IP Address
          </label>
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="e.g. 10.0.X.Y"
                value={targetIP}
                onChange={(e) => setTargetIP(e.target.value)}
                disabled={transmissionState === 'transmitting'}
                className="w-full bg-slate-900 border border-gray-700 focus:border-red-500 focus:ring-1 focus:ring-red-500/50 rounded px-3 py-2 text-sm text-red-200 font-mono tracking-wider outline-none placeholder-gray-600"
              />
            </div>
            <button
              type="button"
              onClick={handleTransmit}
              disabled={transmissionState === 'transmitting'}
              className="px-6 py-2.5 rounded bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-bold tracking-widest text-xs uppercase shadow-lg shadow-red-900/60 border border-red-400/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <span>TRANSMIT</span>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          </div>
        </div>

        {/* Status / Output Section */}
        {transmissionState !== 'idle' && (
          <div className="mt-3 pt-3 border-t border-gray-800">
            {/* Progress Bar */}
            {(transmissionState === 'connecting' ||
              transmissionState === 'checking' ||
              transmissionState === 'transmitting') && (
              <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden mb-3 border border-red-900/50">
                <div
                  className="bg-gradient-to-r from-red-600 to-rose-400 h-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}

            {/* Blocked state with Red Shield Icon */}
            {transmissionState === 'blocked' ? (
              <div className="flex items-center space-x-3 p-3 bg-red-950/60 border border-red-600 rounded-md">
                <svg className="w-6 h-6 text-red-500 flex-shrink-0 animate-pulse" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" />
                </svg>
                <div className="text-xs">
                  <span className="font-bold text-red-400 block tracking-wide">
                    CONNECTION BLOCKED
                  </span>
                </div>
              </div>
            ) : transmissionState === 'success' ? (
              <div className="flex items-center space-x-3 p-3 bg-emerald-950/60 border border-emerald-500 rounded-md text-xs text-emerald-300">
                <svg className="w-6 h-6 text-emerald-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <div>
                  <span className="font-bold block tracking-wide">TRANSMISSION DELIVERED</span>
                  <span className="font-sans text-emerald-200">{statusMessage}</span>
                </div>
              </div>
            ) : transmissionState === 'error' ? (
              <div className="flex items-center space-x-3 p-3 bg-amber-950/60 border border-amber-600 rounded-md text-xs text-amber-300">
                <svg className="w-5 h-5 text-amber-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{statusMessage}</span>
              </div>
            ) : (
              <div className="flex items-center space-x-3 text-xs text-red-300 py-1">
                <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
                <span>{statusMessage}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Target Spec Information */}
      <div className="mt-auto pt-4 text-[11px] text-gray-500 font-mono flex items-center justify-between border-t border-gray-900">
        <span>SECURITY LEVEL: LAYER 2 BREACH OPS</span>
        <span>CHANNEL: ENCRYPTED // UDP TUNNEL</span>
      </div>
    </div>
  );
}
