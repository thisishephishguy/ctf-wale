import React, { useState, useEffect, useRef, useMemo } from 'react';
import supabase from '../lib/supabase';
import {
  CATEGORIES,
  SPECIAL_CHARS as SPECIAL_CHAR_POOL,
  getAllWords,
  getWordHint,
  getWordCategory,
  generateSingleCredentials
} from '../lib/categories';

/**
 * Layer 1 - PasswordBreach component
 * Full-screen cyber terminal / hacker interface for cracking the target system password.
 * Format: lowercase word + single digit + special character (e.g., russia7$, eagle3#)
 */
export default function PasswordBreach({
  targetTeamId,
  attackerTeamId,
  onComplete
}) {
  const [targetTeam, setTargetTeam] = useState(null);
  const [loadingTarget, setLoadingTarget] = useState(true);
  const [startTime] = useState(() => Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Password Input state
  const [directPassword, setDirectPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Brute-force Assist state
  const [assistGuess, setAssistGuess] = useState('');
  const [bruteForceActive, setBruteForceActive] = useState(false);
  const [bruteForceStage, setBruteForceStage] = useState(null); // 'matching' | 'failed' | 'success'
  const [bruteForceProgress, setBruteForceProgress] = useState(0);
  const [bruteForceMessage, setBruteForceMessage] = useState('');
  const [rollingAttempt, setRollingAttempt] = useState('');
  const [bruteFailError, setBruteFailError] = useState('');

  // Decrypting animation states for hints (2 seconds animation)
  const [decryptingHint1, setDecryptingHint1] = useState(true);
  const [decryptingHint2, setDecryptingHint2] = useState(false);
  const [decryptingHint3, setDecryptingHint3] = useState(false);

  // Canvas ref for matrix rain
  const canvasRef = useRef(null);

  // 1. Fetch Target Team Data from Supabase
  useEffect(() => {
    let isMounted = true;
    async function fetchTargetTeam() {
      if (!targetTeamId) {
        setLoadingTarget(false);
        return;
      }
      try {
        const { data: targetTeamData, error } = await supabase
          .from('teams')
          .select('id, game_id, opponent_id, system_password, password_category, password_hint')
          .eq('id', targetTeamId)
          .maybeSingle();

        if (error) {
          console.warn('[PasswordBreach] Error fetching target team:', error.message);
        }
        if (isMounted) {
          if (targetTeamData) {
            setTargetTeam(targetTeamData);
          } else {
            // Fallback team data with compliant CSPRNG generated credentials
            const fallbackCred = generateSingleCredentials();
            setTargetTeam({
              id: targetTeamId,
              name: 'TARGET SYSTEM',
              system_username: 'target_root',
              system_password: fallbackCred.password,
              password_category: fallbackCred.category,
              password_hint: fallbackCred.hint,
              game_id: null
            });
          }
          setLoadingTarget(false);
        }
      } catch (err) {
        console.error('[PasswordBreach] Exception fetching target team:', err);
        if (isMounted) {
          const fallbackCred = generateSingleCredentials();
          setTargetTeam({
            id: targetTeamId,
            name: 'OPPONENT WORKSTATION',
            system_username: 'target_admin',
            system_password: fallbackCred.password,
            password_category: fallbackCred.category,
            password_hint: fallbackCred.hint,
            game_id: null
          });
          setLoadingTarget(false);
        }
      }
    }

    fetchTargetTeam();
    return () => {
      isMounted = false;
    };
  }, [targetTeamId]);

  // 2. Timer tracker for elapsed seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [startTime]);

  // Initial Hint 1 decrypting animation for 2 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setDecryptingHint1(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Hint 2 trigger: unlocks at 120s (+2 minutes), 2-second decrypting animation
  useEffect(() => {
    if (elapsedSeconds >= 120 && elapsedSeconds < 122) {
      setDecryptingHint2(true);
    } else if (elapsedSeconds >= 122) {
      setDecryptingHint2(false);
    }
  }, [elapsedSeconds]);

  // Hint 3 trigger: unlocks at 240s (+2 more minutes), 2-second decrypting animation
  useEffect(() => {
    if (elapsedSeconds >= 240 && elapsedSeconds < 242) {
      setDecryptingHint3(true);
    } else if (elapsedSeconds >= 242) {
      setDecryptingHint3(false);
    }
  }, [elapsedSeconds]);

  // Password Derivation Logic
  const realPassword = (targetTeam?.system_password || 'russia7$').trim();

  const { wordPart, digitPart, specialPart, categoryName } = useMemo(() => {
    const wordMatch = realPassword.match(/^[a-zA-Z]+/);
    const word = wordMatch ? wordMatch[0].toLowerCase() : 'russia';

    const digitMatch = realPassword.match(/\d/);
    const digit = digitMatch ? digitMatch[0] : '7';

    const specialMatch = realPassword.match(/[^a-zA-Z0-9]/);
    const special = specialMatch ? specialMatch[0] : '$';

    // Determine category from targetTeam or wordlist
    let cat = (targetTeam?.password_category || '').toLowerCase();
    if (!cat || !CATEGORIES[cat]) {
      cat = getWordCategory(word) || 'countries';
    }

    return {
      wordPart: word,
      digitPart: digit,
      specialPart: special,
      categoryName: cat.toUpperCase()
    };
  }, [realPassword, targetTeam]);

  // Pair for Hint 3: real special char + 1 random decoy in random order
  const specialCharPair = useMemo(() => {
    const decoys = SPECIAL_CHAR_POOL.filter((c) => c !== specialPart);
    const randomDecoy = decoys[Math.floor(Math.random() * decoys.length)] || '#';
    const pair = Math.random() > 0.5 ? [specialPart, randomDecoy] : [randomDecoy, specialPart];
    return pair;
  }, [specialPart]);

  // Matrix Rain Canvas Effect
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
    canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;

    const chars = '0123456789ABCDEF!@#$%&*<>[]{}~+=-_/?';
    const fontSize = 14;
    const columns = Math.floor(canvas.width / fontSize);
    const drops = new Array(columns).fill(1);

    const draw = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = bruteForceActive ? '#ef4444' : '#22c55e';
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        const text = chars.charAt(Math.floor(Math.random() * chars.length));
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
      animationFrameId = requestAnimationFrame(draw);
    };

    animationFrameId = requestAnimationFrame(draw);

    const handleResize = () => {
      if (!canvas) return;
      canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [bruteForceActive]);

  // Complete Layer 1 and record in layer_progress
  const handleSuccessBreach = async () => {
    setIsSuccess(true);
    const duration = Math.max(1, Math.floor((Date.now() - startTime) / 1000));

    try {
      const effectiveAttackerId =
        (attackerTeamId && attackerTeamId !== 'team-alpha')
          ? attackerTeamId
          : sessionStorage.getItem('traz_attacker_team_id') ||
            sessionStorage.getItem('traz_team_id') ||
            targetTeam?.opponent_id;

      if (effectiveAttackerId) {
        let activeGameId = targetTeam?.game_id;
        if (!activeGameId) {
          const { data: teamData } = await supabase
            .from('teams')
            .select('game_id')
            .or(`id.eq.${effectiveAttackerId},id.eq.${targetTeamId}`)
            .maybeSingle();
          activeGameId = teamData?.game_id;
        }

        if (activeGameId) {
          const progressPayload = {
            game_id: activeGameId,
            attacker_team_id: effectiveAttackerId,
            layer_number: 1,
            started_at: new Date(startTime).toISOString(),
            completed_at: new Date().toISOString(),
            duration_seconds: duration
          };

          const { error: lpErr } = await supabase.from('layer_progress').upsert(progressPayload, {
            onConflict: 'game_id,attacker_team_id,layer_number'
          });

          if (lpErr) {
            console.error('[PasswordBreach] layer_progress upsert error:', lpErr);
          } else {
            console.log('[PasswordBreach] layer_progress Layer 1 recorded successfully:', progressPayload);
          }
        } else {
          console.error('[PasswordBreach] Cannot record Layer 1: activeGameId missing');
        }
      }
    } catch (e) {
      console.error('[PasswordBreach] Error updating layer_progress:', e);
    }

    setTimeout(() => {
      if (onComplete) {
        onComplete({
          layer: 1,
          durationSeconds: duration,
          password: realPassword
        });
      }
    }, 2200);
  };

  // Direct Password Guess Submission
  const handleDirectSubmit = (e) => {
    e.preventDefault();
    if (!directPassword.trim() || isSuccess || bruteForceActive) return;

    if (directPassword.trim() === realPassword) {
      setPasswordError('');
      handleSuccessBreach();
    } else {
      setPasswordError('ACCESS DENIED: INVALID SYSTEM CREDENTIALS');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 600);
    }
  };

  // Brute-force Assist Submission
  const handleInitiateBruteForce = (e) => {
    e.preventDefault();
    if (!assistGuess.trim() || bruteForceActive || isSuccess) return;

    setBruteFailError('');
    const cleanGuess = assistGuess.trim().toLowerCase();
    const cleanWord = wordPart.toLowerCase();

    // Check partial match according to specifications:
    // Close match = guess.toLowerCase() matches at least the first 3 chars of the word part
    // OR word.toLowerCase().startsWith(guess.toLowerCase()) and guess.length >= 3
    const isClose =
      cleanGuess.length >= 3 &&
      (cleanWord.startsWith(cleanGuess) ||
        (cleanWord.length >= 3 && cleanGuess.startsWith(cleanWord.slice(0, 3))) ||
        cleanGuess.slice(0, 3) === cleanWord.slice(0, 3));

    if (isClose) {
      // Initiate 60 second sequence
      setBruteForceActive(true);
      setBruteForceStage('matching');
      setBruteForceProgress(0);
      setBruteForceMessage('Initializing dictionary permutation attack...');

      const durationMs = 60000;
      const startSeq = Date.now();

      const sampleWords = getAllWords();

      const interval = setInterval(() => {
        const elapsed = Date.now() - startSeq;
        const pct = Math.min(100, Math.floor((elapsed / durationMs) * 100));
        setBruteForceProgress(pct);

        // Update randomized candidate hash / word display
        const randomWord = sampleWords[Math.floor(Math.random() * sampleWords.length)];
        const randomNum = Math.floor(Math.random() * 10);
        const randomSpecial = SPECIAL_CHAR_POOL[Math.floor(Math.random() * SPECIAL_CHAR_POOL.length)];
        const randomHash = Math.random().toString(16).substring(2, 8).toUpperCase();
        setRollingAttempt(`${randomWord}${randomNum}${randomSpecial} [0x${randomHash}]`);

        // Stage messages based on time
        if (elapsed < 15000) {
          setBruteForceMessage('Scanning entropy dictionary matrix...');
        } else if (elapsed < 30000) {
          setBruteForceMessage('Character frequency collision detected...');
        } else if (elapsed < 45000) {
          setBruteForceMessage('Narrowing keyspace permutations...');
        } else if (elapsed < 58000) {
          setBruteForceMessage('Validating cryptanalytic hash signature...');
        } else {
          setBruteForceMessage('PASSWORD RECOVERED!');
        }

        if (elapsed >= durationMs) {
          clearInterval(interval);
          setRollingAttempt(`${realPassword} [VERIFIED]`);
          setBruteForceMessage('PASSWORD RECOVERED!');
          setBruteForceProgress(100);
          setBruteForceActive(false);
          setBruteForceStage('success');
          handleSuccessBreach();
        }
      }, 100);
    } else {
      // Not a close match -> 20s processing animation
      setBruteForceActive(true);
      setBruteForceStage('failed');
      setBruteForceMessage('Analyzing keyspace against dictionary matrix...');

      setTimeout(() => {
        setBruteForceActive(false);
        setBruteForceStage(null);
        setBruteFailError('No results found. Refine your guess.');
      }, 20000);
    }
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative min-h-screen w-full bg-black text-green-400 font-mono overflow-x-hidden flex flex-col justify-between selection:bg-green-500 selection:text-black">
      {/* Background Matrix Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none opacity-25 z-0"
      />

      {/* Grid Scanline Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-green-950/20 via-black/80 to-black pointer-events-none z-0" />
      <div className="absolute inset-0 bg-scanline pointer-events-none z-0 opacity-15" />

      {/* Top Header Bar */}
      <header className="relative z-10 w-full border-b border-green-800/60 bg-black/85 backdrop-blur px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-widest text-red-500 uppercase animate-glitch">
              BREACHING TARGET SYSTEM...
            </h1>
            <p className="text-xs text-gray-400">
              LAYER 1: GATEWAY AUTHENTICATION BYPASS // TARGET:{' '}
              <span className="text-green-300 font-bold">
                {loadingTarget ? 'QUERYING...' : targetTeam?.name || 'TARGET_SYSTEM'}
              </span>
            </p>
          </div>
        </div>

        {/* Live Elapsed Stopwatch */}
        <div className="flex items-center space-x-4 bg-green-950/40 border border-green-700/50 px-4 py-2 rounded">
          <div className="flex flex-col text-right">
            <span className="text-[10px] text-gray-400 uppercase tracking-widest">
              ELAPSED TIME
            </span>
            <span className="text-lg font-bold text-green-300 tracking-wider">
              {formatTime(elapsedSeconds)}
            </span>
          </div>
          <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
        </div>
      </header>

      {/* Main Breach Content */}
      <main className="relative z-10 flex-1 max-w-5xl mx-auto w-full p-4 sm:p-8 flex flex-col gap-6 justify-center">
        {/* Success Banner Overlay if cracked */}
        {isSuccess && (
          <div className="p-6 rounded-lg bg-green-950/90 border-2 border-green-400 text-center shadow-[0_0_30px_rgba(34,197,94,0.6)] animate-pulse">
            <h2 className="text-3xl font-extrabold text-green-300 tracking-widest uppercase mb-2">
              [SYSTEM BREACHED]
            </h2>
            <p className="text-sm text-green-200">
              GATEWAY AUTHENTICATION CRACKED! INITIALIZING LAYER 2 NETWORK ACCESS...
            </p>
            <div className="mt-3 font-mono text-xs text-green-400">
              DECRYPTED KEY: <span className="font-bold underline">{realPassword}</span>
            </div>
          </div>
        )}

        {/* Target Intel Summary Panel */}
        <div className="bg-gray-950/80 border border-green-700/40 rounded-lg p-5 backdrop-blur shadow-xl">
          <div className="flex items-center justify-between border-b border-green-800/40 pb-2 mb-4">
            <span className="text-xs uppercase font-bold tracking-widest text-green-500 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full" />
              INTELLIGENCE & SYSTEM RECON
            </span>
            <span className="text-[11px] text-gray-400">
              TARGET NODE: {targetTeam?.system_username || 'target_user'}
            </span>
          </div>

          {/* Hint Feed */}
          <div className="space-y-3">
            {/* Hint 1: Immediate (0 seconds) */}
            <div className="p-3 bg-black/60 border-l-4 border-green-500 rounded text-xs leading-relaxed">
              <div className="flex items-center justify-between mb-1 text-green-400 font-bold">
                <span>[HINT 01 - ACTIVE]</span>
                <span className="text-[10px] text-gray-500">T+00:00</span>
              </div>
              {decryptingHint1 ? (
                <div className="flex items-center space-x-2 text-green-300 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-ping" />
                  <span>Decrypting intelligence...</span>
                </div>
              ) : (
                <p className="text-green-300">
                  Intelligence report: <strong className="text-white underline tracking-wide">{targetTeam?.password_hint || getWordHint(wordPart) || `The password word belongs to the category: ${categoryName}`}</strong>
                </p>
              )}
            </div>

            {/* Hint 2: +2 Minutes (120 seconds) */}
            <div
              className={`p-3 border-l-4 rounded text-xs transition-all ${
                elapsedSeconds >= 120
                  ? 'bg-black/60 border-cyan-400 text-cyan-300'
                  : 'bg-black/30 border-gray-700 text-gray-600'
              }`}
            >
              <div className="flex items-center justify-between mb-1 font-bold">
                <span>
                  {elapsedSeconds >= 120
                    ? '[HINT 02 - DECRYPTED]'
                    : '[HINT 02 - ENCRYPTED]'}
                </span>
                <span className="text-[10px]">
                  {elapsedSeconds >= 120
                    ? 'T+02:00'
                    : `UNLOCKS AT 02:00 (IN ${Math.max(0, 120 - elapsedSeconds)}s)`}
                </span>
              </div>
              {elapsedSeconds >= 120 ? (
                decryptingHint2 ? (
                  <div className="flex items-center space-x-2 text-cyan-300 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                    <span>Decrypting intelligence...</span>
                  </div>
                ) : (
                  <p className="text-cyan-300">
                    Intercepted data fragment: The password contains the digit{' '}
                    <strong className="text-white font-mono underline">{digitPart}</strong> and ends with a special character
                  </p>
                )
              ) : (
                <p className="italic text-gray-600">
                  Signal intercept payload undergoing entropy decryption...
                </p>
              )}
            </div>

            {/* Hint 3: +2 More Minutes (240 seconds / 4 min total) */}
            <div
              className={`p-3 border-l-4 rounded text-xs transition-all ${
                elapsedSeconds >= 240
                  ? 'bg-black/60 border-amber-400 text-amber-300'
                  : 'bg-black/30 border-gray-700 text-gray-600'
              }`}
            >
              <div className="flex items-center justify-between mb-1 font-bold">
                <span>
                  {elapsedSeconds >= 240
                    ? '[HINT 03 - DECRYPTED]'
                    : '[HINT 03 - ENCRYPTED]'}
                </span>
                <span className="text-[10px]">
                  {elapsedSeconds >= 240
                    ? 'T+04:00'
                    : `UNLOCKS AT 04:00 (IN ${Math.max(0, 240 - elapsedSeconds)}s)`}
                </span>
              </div>
              {elapsedSeconds >= 240 ? (
                decryptingHint3 ? (
                  <div className="flex items-center space-x-2 text-amber-300 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                    <span>Decrypting intelligence...</span>
                  </div>
                ) : (
                  <p className="text-amber-300">
                    Decoded transmission: The special character is either{' '}
                    <strong className="text-white font-mono underline">{specialCharPair[0]}</strong> or{' '}
                    <strong className="text-white font-mono underline">{specialCharPair[1]}</strong>
                  </p>
                )
              ) : (
                <p className="italic text-gray-600">
                  Awaiting secondary signal intercept buffer...
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Primary Manual Password Entry */}
        <div
          className={`bg-gray-950/90 border rounded-lg p-5 backdrop-blur transition-all duration-200 shadow-xl ${
            isShaking
              ? 'border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)] translate-x-1'
              : 'border-green-600/50'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <label
              htmlFor="system-pass-input"
              className="text-xs uppercase font-bold tracking-wider text-green-400 flex items-center gap-2"
            >
              <span>&gt;</span> DIRECT CREDENTIAL ENTRY
            </label>
            <span className="text-[10px] text-gray-500 uppercase">
              EXACT SYSTEM PASSWORD REQUIRED
            </span>
          </div>

          <form onSubmit={handleDirectSubmit} className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                id="system-pass-input"
                type="text"
                autoComplete="off"
                disabled={isSuccess || bruteForceActive}
                value={directPassword}
                onChange={(e) => {
                  setDirectPassword(e.target.value);
                  setPasswordError('');
                }}
                placeholder="Enter target password..."
                className="flex-1 bg-black/90 border border-green-600/60 rounded px-4 py-2.5 text-green-300 font-mono text-sm focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400 transition placeholder-gray-600 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isSuccess || bruteForceActive || !directPassword.trim()}
                className="px-6 py-2.5 bg-green-600 hover:bg-green-500 disabled:bg-gray-800 disabled:text-gray-600 text-black font-extrabold text-xs uppercase tracking-wider rounded transition-all shadow-md active:scale-95 cursor-pointer disabled:cursor-not-allowed"
              >
                SUBMIT CREDENTIALS
              </button>
            </div>

            {/* Error Message */}
            {passwordError && (
              <div className="p-2.5 rounded bg-red-950/80 border border-red-600 text-red-400 text-xs font-bold flex items-center gap-2 animate-bounce">
                <svg className="w-4 h-4 shrink-0 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{passwordError}</span>
              </div>
            )}
          </form>
        </div>

        {/* BRUTE-FORCE ASSIST PANEL (Visible after 4 minutes / 240s) */}
        {elapsedSeconds >= 240 && (
          <div className="bg-neutral-950/95 border-2 border-red-600/70 rounded-lg p-5 backdrop-blur shadow-[0_0_25px_rgba(239,68,68,0.2)]">
            <div className="flex items-center justify-between border-b border-red-800/40 pb-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
                <h3 className="text-sm font-black tracking-widest text-red-400 uppercase">
                  AUTOMATED BRUTE-FORCE ASSIST MODULE
                </h3>
              </div>
              <span className="text-[10px] bg-red-950 text-red-300 border border-red-600/50 px-2 py-0.5 rounded font-mono font-bold">
                OVERDRIVE AVAILABLE
              </span>
            </div>

            <p className="text-xs text-gray-300 mb-4">
              Automated cracking module available. Enter your best guess for the base word. If close match is found, the system will run a 60-second permutation rainbow table crack.
            </p>

            {/* If not running active sequence */}
            {!bruteForceActive && bruteForceStage !== 'success' && (
              <form onSubmit={handleInitiateBruteForce} className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={assistGuess}
                    onChange={(e) => {
                      setAssistGuess(e.target.value);
                      setBruteFailError('');
                    }}
                    placeholder="Enter base word guess..."
                    className="flex-1 bg-black/90 border border-red-600/60 rounded px-4 py-2.5 text-red-200 font-mono text-sm focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400 placeholder-gray-600"
                  />
                  <button
                    type="submit"
                    disabled={!assistGuess.trim()}
                    className="px-6 py-2.5 bg-red-600 hover:bg-red-500 disabled:bg-gray-800 disabled:text-gray-600 text-black font-extrabold text-xs uppercase tracking-wider rounded transition-all shadow-md active:scale-95 cursor-pointer disabled:cursor-not-allowed"
                  >
                    INITIATE BRUTE-FORCE
                  </button>
                </div>

                {bruteFailError && (
                  <div className="p-2.5 rounded bg-red-950/60 border border-red-500 text-red-300 text-xs flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    <span>{bruteFailError}</span>
                  </div>
                )}
              </form>
            )}

            {/* Running Active Brute Force Sequence (60s close match) */}
            {bruteForceActive && bruteForceStage === 'matching' && (
              <div className="p-4 bg-black/90 border border-red-500/80 rounded space-y-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-red-400 font-bold tracking-wider animate-pulse flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-500 rounded-full" />
                    {bruteForceMessage}
                  </span>
                  <span className="text-red-300 font-mono font-bold">
                    {bruteForceProgress}%
                  </span>
                </div>

                {/* Progress bar (60s) */}
                <div className="w-full bg-gray-900 h-3 rounded-full overflow-hidden border border-red-600/40">
                  <div
                    className="bg-gradient-to-r from-red-600 via-amber-500 to-green-500 h-full transition-all duration-100 ease-linear"
                    style={{ width: `${bruteForceProgress}%` }}
                  />
                </div>

                {/* Live hash / candidate permutation feed */}
                <div className="bg-black border border-red-900/60 p-3 rounded font-mono text-xs text-red-300/90 flex items-center justify-between">
                  <span>TESTING PERMUTATION:</span>
                  <span className="font-bold tracking-widest text-white">
                    {rollingAttempt || 'CALCULATING...'}
                  </span>
                </div>
              </div>
            )}

            {/* Running Active Non-Matching Spinner (20s) */}
            {bruteForceActive && bruteForceStage === 'failed' && (
              <div className="p-4 bg-black/80 border border-neutral-700 rounded flex items-center space-x-3">
                <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin shrink-0" />
                <span className="text-xs text-gray-300 font-mono animate-pulse">
                  Processing keyspace permutations... Please wait.
                </span>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer Info */}
      <footer className="relative z-10 w-full border-t border-green-900/40 bg-black/90 px-6 py-2.5 flex items-center justify-between text-[11px] text-gray-500">
        <div className="flex items-center space-x-3">
          <span>TRAZ CYBER CTF // INTRUSION SUITE v2.4</span>
          <span className="text-gray-700">|</span>
          <span className="text-gray-400 font-mono text-[10px]">Made by Taha</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span>CONNECTED TO OPPONENT GATEWAY</span>
        </div>
      </footer>
    </div>
  );
}
