import React, { useState, useEffect } from 'react';
import supabase from '../../lib/supabase';

const DEFAULT_METADATA = [
  { id: 0, path: '/var/www/assets/logo_glyph_01.svg', label: 'Image 0', defaultFragment: 'SHADOW', defaultOrder: 1 },
  { id: 1, path: '/home/user/pictures/vector_tri.svg', label: 'Image 1', defaultFragment: 'NEXUS', defaultOrder: 2 },
  { id: 2, path: '/etc/opt/branding/quad_badge.svg', label: 'Image 2', defaultFragment: 'CIPHER', defaultOrder: 3 },
  { id: 3, path: '/usr/share/pixmaps/hex_glyph.svg', label: 'Image 3', defaultFragment: 'VALKYRIE', defaultOrder: 4 },
  { id: 4, path: '/tmp/.hidden/prism.svg', label: 'Image 4', defaultFragment: 'BANANA', defaultOrder: 13 },
  { id: 5, path: '/home/user/downloads/star_test.svg', label: 'Image 5', defaultFragment: 'GHOST', defaultOrder: 99 }
];

export default function StegExtract({ targetTeamId = 'team-alpha', attackerTeamId }) {
  const [images, setImages] = useState(DEFAULT_METADATA);
  const [scanningId, setScanningId] = useState(null);
  const [scanStep, setScanStep] = useState('');
  const [revealed, setRevealed] = useState({});
  const [combinedInput, setCombinedInput] = useState('');
  const [testResult, setTestResult] = useState(null);
  const [expectedPassword, setExpectedPassword] = useState('');
  const [selectedPreview, setSelectedPreview] = useState(null);

  // Load fragment data from stego_fragments table and target team_state
  useEffect(() => {
    let isMounted = true;

    async function loadFragments() {
      try {
        // Query stego_fragments for this target team
        const { data: fragData, error: fragErr } = await supabase
          .from('stego_fragments')
          .select('*')
          .eq('team_id', targetTeamId);

        if (fragErr) {
          console.error('Failed to load stego fragments:', fragErr);
        }

        // Fetch endpoint_password from target's team_state if available
        const { data: teamData, error: teamErr } = await supabase
          .from('team_state')
          .select('endpoint_password')
          .eq('team_id', targetTeamId)
          .maybeSingle();

        if (teamErr) {
          console.error('Failed to load target team state:', teamErr);
        }

        if (isMounted) {
          if (teamData?.endpoint_password) {
            setExpectedPassword(teamData.endpoint_password.trim());
          }

          if (fragData && fragData.length > 0) {
            // Merge database fragment records into image definitions by image_index
            const updated = DEFAULT_METADATA.map((img, idx) => {
              const match = fragData.find((f) => f.image_index === idx);
              if (match) {
                return {
                  ...img,
                  defaultFragment: match.word || img.defaultFragment,
                  defaultOrder: match.order_marker ?? img.defaultOrder
                };
              }
              return img;
            });
            setImages(updated);
          }
        }
      } catch (err) {
        console.error('Unexpected error loading stego fragments:', err);
      }
    }

    if (targetTeamId) {
      loadFragments();
    }

    return () => {
      isMounted = false;
    };
  }, [targetTeamId]);

  // Scan handler with multi-stage analysis animation
  const handleScan = (img) => {
    if (scanningId !== null) return;
    setScanningId(img.id);
    setScanStep('Analyzing pixel data & LSB layers...');

    setTimeout(() => {
      setScanStep('Extracting hidden steganographic payload...');
    }, 900);

    setTimeout(() => {
      setScanStep('Decoding ASCII payload & parity checksum...');
    }, 1800);

    setTimeout(() => {
      setRevealed((prev) => ({
        ...prev,
        [img.id]: {
          fragment: img.defaultFragment,
          order: img.defaultOrder
        }
      }));
      setScanningId(null);
      setScanStep('');
    }, 2500);
  };

  // Append fragment word to builder input
  const handleAppendFragment = (word) => {
    setCombinedInput((prev) => {
      if (!prev) return word;
      return `${prev}${word}`;
    });
  };

  // Test combined password against target team_state endpoint_password
  const handleTestPassword = async () => {
    const cleanInput = combinedInput.trim().toUpperCase().replace(/[\s\-_]+/g, '');
    const targetMatch = (expectedPassword || '').trim().toUpperCase().replace(/[\s\-_]+/g, '');

    if (targetMatch && cleanInput === targetMatch) {
      setTestResult({
        success: true,
        message: `VALID ENDPOINT PASSWORD! Access Code: "${combinedInput.trim()}". Endpoint Management Console (ManageApp) has been unlocked!`
      });

      // 1. Unlock manage console in target team_state
      try {
        await supabase
          .from('team_state')
          .update({ manage_unlocked: true })
          .eq('team_id', targetTeamId);
      } catch (tsErr) {
        console.error('[StegExtract] Error unlocking manage on team_state:', tsErr);
      }

      // 2. Record Layer 4 in layer_progress
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
          if (!activeGameId && targetTeamId) {
            const { data: tInfo } = await supabase.from('teams').select('game_id').eq('id', targetTeamId).maybeSingle();
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

            const { error: lpErr } = await supabase.from('layer_progress').upsert({
              game_id: activeGameId,
              attacker_team_id: effAttackerId,
              layer_number: 4,
              started_at: startedIso,
              completed_at: new Date().toISOString(),
              duration_seconds: durationSec
            }, { onConflict: 'game_id,attacker_team_id,layer_number' });

            if (lpErr) {
              console.error('[StegExtract] Layer 4 upsert error:', lpErr);
            } else {
              console.log('[StegExtract] Layer 4 recorded in layer_progress with duration:', durationSec);
            }
          }
        }
      } catch (lpErr) {
        console.error('[StegExtract] Error recording Layer 4 progress:', lpErr);
      }
    } else {
      setTestResult({
        success: false,
        message: 'AUTHENTICATION FAILED: Invalid endpoint password.'
      });
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-950 text-gray-100 font-mono p-4 space-y-4 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-800">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-purple-950 border border-purple-500/50 flex items-center justify-center text-purple-400 shadow-md">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
              <path d="M11 8v6M8 11h6" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-wider text-white">
              STEG EXTRACT - Steganography Analyzer
            </h1>
            <p className="text-xs text-gray-400">
              Layer 4 Digital Forensics & LSB Extraction | Target: <span className="text-cyan-400">{targetTeamId}</span>
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] text-gray-400 uppercase tracking-widest block">Extracted</span>
          <span className="text-xs font-bold text-purple-400">
            {Object.keys(revealed).length} / {images.length} FILES
          </span>
        </div>
      </div>

      {/* Grid of 6 Image Cards (2x3 or 3x2 responsive) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {images.map((img) => {
          const isScanning = scanningId === img.id;
          const result = revealed[img.id];

          return (
            <div
              key={img.id}
              className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all ${
                result
                  ? 'bg-gray-900/90 border-purple-500/50 shadow-md shadow-purple-950/30'
                  : isScanning
                  ? 'bg-purple-950/30 border-purple-400 animate-pulse'
                  : 'bg-gray-900/60 border-gray-800 hover:border-gray-700'
              }`}
            >
              {/* Image Metadata Bar */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-200 truncate">{img.label}</span>
                <span className="text-[10px] text-gray-500 font-mono">image{img.id}.svg</span>
              </div>

              {/* Actual <img> Tag - Visible & Browsable before scanning */}
              <div
                onClick={() => setSelectedPreview(img)}
                className="relative w-full aspect-square max-h-44 bg-[#0a0a0a] rounded-lg border border-neutral-800 flex items-center justify-center p-2 mb-3 cursor-pointer group overflow-hidden"
                title="Click for full-resolution view"
              >
                <img
                  src={`/stego/image${img.id}.svg`}
                  alt={img.label}
                  className="w-full h-full object-contain transition-transform duration-200 group-hover:scale-105"
                  loading="eager"
                />

                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 px-1.5 py-0.5 rounded text-[9px] text-gray-300">
                  🔍 View
                </div>

                {isScanning && (
                  <div className="absolute inset-0 bg-purple-950/80 backdrop-blur-[2px] flex flex-col items-center justify-center p-3 text-center space-y-2">
                    <span className="w-3 h-3 rounded-full bg-purple-400 animate-ping" />
                    <span className="text-[11px] text-purple-300 font-semibold">{scanStep}</span>
                  </div>
                )}
              </div>

              {/* Scan Button or Fragment Result below each image */}
              <div className="w-full pt-1 border-t border-gray-800/80 mt-auto">
                {result ? (
                  <div className="space-y-1.5">
                    <div className="text-xs font-bold px-2 py-1.5 rounded border text-center bg-purple-950/60 text-purple-200 border-purple-500/40">
                      <div className="text-sm font-black tracking-wider text-white font-mono">
                        {result.fragment}
                      </div>
                      <div className="text-[11px] text-purple-300 font-mono mt-0.5">
                        Fragment #{result.order}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAppendFragment(result.fragment)}
                      className="w-full py-1 text-center text-[10px] text-cyan-400 hover:text-cyan-200 bg-cyan-950/40 border border-cyan-800/60 rounded hover:bg-cyan-900/40 transition cursor-pointer"
                    >
                      + Append to Password
                    </button>
                  </div>
                ) : isScanning ? (
                  <div className="text-center py-2 text-[11px] text-purple-300 animate-pulse font-semibold">
                    SCANNING...
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleScan(img)}
                    disabled={scanningId !== null}
                    className="w-full py-2 bg-purple-700 hover:bg-purple-600 disabled:opacity-40 text-white font-bold text-xs uppercase tracking-wider rounded border border-purple-400/80 shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>🔍</span>
                    <span>SCAN IMAGE</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Combine Fragments Section */}
      <div className="flex-1 flex flex-col bg-gray-900/90 border border-gray-800 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-gray-800 pb-2">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-200">
              Password Assembly Area
            </h2>
          </div>
          <span className="text-[11px] text-gray-500">Master Authentication Portal</span>
        </div>

        {/* Revealed Chips Quick-Click */}
        {Object.keys(revealed).length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-gray-400">Extracted Fragments:</span>
            {Object.entries(revealed).map(([id, frag]) => (
              <button
                key={id}
                type="button"
                onClick={() => handleAppendFragment(frag.fragment)}
                className="text-xs px-2.5 py-1 rounded border border-cyan-500/50 bg-cyan-950/40 text-cyan-300 hover:bg-cyan-900/60 transition-colors cursor-pointer"
              >
                {frag.fragment} <span className="opacity-70 text-[10px]">Fragment #{frag.order}</span>
              </button>
            ))}
          </div>
        )}

        {/* Input & Submit Area */}
        <div className="flex flex-col sm:flex-row items-center gap-2">
          <div className="relative flex-1 w-full">
            <input
              type="text"
              value={combinedInput}
              onChange={(e) => setCombinedInput(e.target.value)}
              placeholder="Enter assembled password..."
              className="w-full bg-black/70 border border-gray-700 focus:border-cyan-400 rounded px-3 py-2 text-sm text-cyan-200 font-mono tracking-wider outline-none placeholder-gray-600"
            />
            {combinedInput && (
              <button
                type="button"
                onClick={() => setCombinedInput('')}
                className="absolute right-2 top-2.5 text-xs text-gray-500 hover:text-white"
              >
                CLEAR
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleTestPassword}
            className="w-full sm:w-auto px-5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs uppercase tracking-wider rounded border border-cyan-400 shadow-md shadow-cyan-950/50 cursor-pointer"
          >
            Submit Password
          </button>
        </div>

        {/* Test Result Feedback */}
        {testResult && (
          <div
            className={`p-3 rounded border text-xs leading-relaxed ${
              testResult.success
                ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-950/40'
                : 'bg-red-950/60 border-red-500 text-red-300 shadow-md shadow-red-950/40'
            }`}
          >
            <div className="font-bold flex items-center space-x-2">
              <span>{testResult.success ? '✓' : '✗'}</span>
              <span>{testResult.message}</span>
            </div>
          </div>
        )}
      </div>

      {/* Larger Preview Modal if clicked */}
      {selectedPreview && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-purple-500/60 rounded-xl max-w-sm w-full overflow-hidden shadow-2xl">
            <div className="bg-purple-950/80 px-4 py-2.5 flex items-center justify-between border-b border-purple-800">
              <span className="text-xs font-bold text-white">{selectedPreview.label}</span>
              <button
                type="button"
                onClick={() => setSelectedPreview(null)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="p-4 bg-[#0a0a0a] flex items-center justify-center">
              <img
                src={`/stego/image${selectedPreview.id}.svg`}
                alt={selectedPreview.label}
                className="w-64 h-64 object-contain"
              />
            </div>
            <div className="p-3 bg-slate-950 border-t border-slate-800 flex justify-between items-center text-xs">
              <span className="text-gray-400 font-mono">/stego/image{selectedPreview.id}.svg</span>
              <button
                type="button"
                onClick={() => setSelectedPreview(null)}
                className="px-3 py-1 bg-purple-700 hover:bg-purple-600 text-white rounded text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
