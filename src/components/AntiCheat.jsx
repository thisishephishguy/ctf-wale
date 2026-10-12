import React, { useState, useEffect, useCallback, useRef } from 'react';
import supabase from '../lib/supabase';
import DevToolsWarning from './DevToolsWarning';

/**
 * Robust check to detect if client is running on a mobile phone or tablet.
 * Mobile browsers do not have docked developer tools, and screen rotation,
 * touch gestures, virtual keyboards, and browser chrome cause dimension changes.
 */
export const isMobileDevice = () => {
  if (typeof window === 'undefined') return false;

  const ua = (navigator.userAgent || navigator.vendor || window.opera || '').toLowerCase();

  // 1. User Agent string checks
  if (
    /android|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|crios|fxios|tablet|silk|kindle|samsung|xiaomi|huawei|oppo|vivo|redmi/i.test(
      ua
    )
  ) {
    return true;
  }

  // 2. Client Hints API (modern Android Chrome, etc.)
  if (navigator.userAgentData?.mobile === true) {
    return true;
  }

  // 3. Touch device without fine mouse pointer (mobile phones & tablets)
  const hasTouch = 'ontouchstart' in window || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
  const isCoarsePointer =
    typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
  const isHoverNone =
    typeof window.matchMedia === 'function' && window.matchMedia('(hover: none)').matches;

  if (hasTouch && (isCoarsePointer || isHoverNone)) {
    return true;
  }

  // 4. Mobile screen dimension heuristics
  if (typeof window.screen !== 'undefined') {
    const minScreenDim = Math.min(window.screen.width, window.screen.height);
    if (minScreenDim < 600 && hasTouch) {
      return true;
    }
  }

  return false;
};

/**
 * AntiCheat Component
 * Enforces CTF integrity on PC/Desktop browsers by blocking shortcuts, right-clicks,
 * detecting open DevTools, and disqualifying the team.
 *
 * Automatically bypasses on mobile devices so screen rotations and virtual keyboards
 * never trigger false disqualifications.
 */
export default function AntiCheat({ teamId, gameId, children, onForfeit }) {
  // Mobile devices are completely exempted from AntiCheat
  const isMobile = isMobileDevice();

  const [acknowledged, setAcknowledged] = useState(() => {
    if (isMobile) return true;
    return sessionStorage.getItem(`traz_anticheat_ack_${teamId}`) === 'true';
  });
  const [isForfeited, setIsForfeited] = useState(false);
  const [forfeitReason, setForfeitReason] = useState('');
  const forfeitTriggeredRef = useRef(false);

  // Trigger Forfeit routine (disqualification) - only operates on desktop
  const triggerForfeit = useCallback(
    async (reason = 'devtools_detected') => {
      if (isMobileDevice()) return; // Never forfeit mobile clients
      if (forfeitTriggeredRef.current) return;
      forfeitTriggeredRef.current = true;

      setIsForfeited(true);
      setForfeitReason(reason);

      const timestamp = new Date().toISOString();

      // 1. Notify parent callback
      if (typeof onForfeit === 'function') {
        try {
          onForfeit(teamId, reason);
        } catch (err) {
          console.error('[AntiCheat] Error calling onForfeit prop:', err);
        }
      }

      // 2. Persist forfeit status to Supabase
      if (teamId) {
        try {
          const { error: teamStateError } = await supabase
            .from('team_state')
            .update({
              forfeited: true,
              forfeit_reason: reason,
              forfeit_at: timestamp,
            })
            .eq('team_id', teamId);

          if (teamStateError) {
            console.error('[AntiCheat] Failed to update team_state forfeit:', teamStateError);
          }
        } catch (err) {
          console.error('[AntiCheat] Failed to update team_state forfeit:', err);
        }

        try {
          const { error: teamsError } = await supabase
            .from('teams')
            .update({
              forfeited: true,
              forfeit_reason: reason,
              forfeit_at: timestamp,
            })
            .eq('id', teamId);

          if (teamsError) {
            console.error('[AntiCheat] Failed to update teams forfeit:', teamsError);
          }
        } catch (err) {
          console.error('[AntiCheat] Failed to update teams forfeit:', err);
        }

        // 3. Broadcast on forfeit_events channel
        try {
          const broadcastChannel = supabase.channel('forfeit_events');
          broadcastChannel.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              broadcastChannel.send({
                type: 'broadcast',
                event: 'devtools_forfeit',
                payload: {
                  teamId,
                  gameId,
                  reason,
                  timestamp,
                },
              });
            }
          });
        } catch (err) {
          console.error('[AntiCheat] Failed to broadcast forfeit event:', err);
        }
      }
    },
    [teamId, gameId, onForfeit]
  );

  // Handle warning acknowledgment
  const handleAcknowledge = () => {
    sessionStorage.setItem(`traz_anticheat_ack_${teamId}`, 'true');
    setAcknowledged(true);
  };

  // 1. Block Keyboard Shortcuts & Right-click context menu (Desktop Only)
  useEffect(() => {
    if (isMobile) return;

    const handleKeyDown = (e) => {
      // Check for F12
      if (e.key === 'F12' || e.keyCode === 123) {
        e.preventDefault();
        e.stopPropagation();
        triggerForfeit('f12_pressed');
        return false;
      }

      const isCtrlOrMeta = e.ctrlKey || e.metaKey;

      if (isCtrlOrMeta) {
        // Ctrl+Shift+I (Inspect), Ctrl+Shift+J (Console), Ctrl+Shift+C (Inspect Element)
        if (e.shiftKey) {
          const keyUpper = e.key ? e.key.toUpperCase() : '';
          if (
            keyUpper === 'I' ||
            keyUpper === 'J' ||
            keyUpper === 'C' ||
            e.keyCode === 73 ||
            e.keyCode === 74 ||
            e.keyCode === 67
          ) {
            e.preventDefault();
            e.stopPropagation();
            triggerForfeit(`devtools_shortcut_${keyUpper || e.keyCode}`);
            return false;
          }
        }

        // Ctrl+U (View Source)
        if (e.key === 'u' || e.key === 'U' || e.keyCode === 85) {
          e.preventDefault();
          e.stopPropagation();
          triggerForfeit('view_source_shortcut');
          return false;
        }
      }
    };

    const handleContextMenu = (e) => {
      e.preventDefault();
      return false;
    };

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('contextmenu', handleContextMenu, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('contextmenu', handleContextMenu, true);
    };
  }, [isMobile, triggerForfeit]);

  // 2. DevTools Heuristic Detection (Desktop Only)
  useEffect(() => {
    if (isMobile || !acknowledged || isForfeited) return;

    // Detection Method a: Window dimensions difference check
    const checkDimensions = () => {
      if (isMobileDevice()) return;

      const widthDiff = window.outerWidth - window.innerWidth;
      const heightDiff = window.outerHeight - window.innerHeight;
      const threshold = 160;

      if (widthDiff > threshold || heightDiff > threshold) {
        triggerForfeit('devtools_window_diff_detected');
      }
    };

    // Detection Method b: Debugger statement timing check
    const checkDebuggerTiming = () => {
      if (isMobileDevice()) return;
      const start = performance.now();
      // eslint-disable-next-line no-debugger
      debugger;
      const end = performance.now();
      if (end - start > 100) {
        triggerForfeit('debugger_breakpoint_delay');
      }
    };

    // Detection Method c: Console logging getter trick
    const checkConsoleGetter = () => {
      if (isMobileDevice()) return;
      const devtoolsDetector = {};
      let getterTriggered = false;

      Object.defineProperty(devtoolsDetector, 'id', {
        get: () => {
          getterTriggered = true;
          triggerForfeit('console_getter_detected');
          return '';
        },
      });

      console.log('%c', devtoolsDetector);
      if (getterTriggered) {
        triggerForfeit('console_getter_detected');
      }
    };

    window.addEventListener('resize', checkDimensions);

    // Run checks at an interval
    const intervalId = setInterval(() => {
      checkDimensions();
      checkDebuggerTiming();
      checkConsoleGetter();
    }, 2000);

    return () => {
      window.removeEventListener('resize', checkDimensions);
      clearInterval(intervalId);
    };
  }, [isMobile, acknowledged, isForfeited, triggerForfeit]);

  // If mobile, render cleanly without warning or forfeit overlay
  if (isMobile) {
    return <>{children}</>;
  }

  // Full-Screen Red Overlay when disqualified (Desktop Only)
  if (isForfeited) {
    return (
      <div className="fixed inset-0 z-[999999] flex flex-col items-center justify-center bg-red-950/95 text-white p-6 font-mono select-none overflow-hidden backdrop-blur-xl">
        <div className="absolute inset-0 border-8 border-red-600 pointer-events-none animate-pulse" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-600/30 via-red-950/80 to-black pointer-events-none" />

        <div className="relative z-10 max-w-2xl w-full text-center space-y-6 bg-black/90 p-8 sm:p-12 rounded-2xl border-4 border-red-600 shadow-[0_0_100px_rgba(239,68,68,0.8)]">
          <div className="w-24 h-24 mx-auto rounded-full bg-red-900/60 border-4 border-red-500 flex items-center justify-center text-red-500 shadow-[0_0_40px_rgba(239,68,68,0.7)] animate-bounce">
            <svg
              className="w-14 h-14"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="2.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
              />
            </svg>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black text-red-500 tracking-widest uppercase leading-tight">
            SESSION TERMINATED
          </h1>

          <div className="bg-red-950/70 border-2 border-red-600/80 rounded-xl p-4 text-sm sm:text-base text-red-200 font-extrabold tracking-wide uppercase">
            DEVTOOLS DETECTED - YOUR TEAM HAS BEEN DISQUALIFIED
          </div>

          <div className="space-y-2 text-xs sm:text-sm text-gray-300">
            <p>
              Team ID:{' '}
              <span className="font-bold text-amber-400">
                {teamId || 'UNKNOWN'}
              </span>
            </p>
            <p>
              Violation:{' '}
              <span className="font-bold text-red-400 uppercase">
                {forfeitReason || 'Unauthorized Inspection'}
              </span>
            </p>
            <p className="text-gray-400 text-xs">
              This incident has been recorded and submitted to game administrators.
            </p>
          </div>

          <div className="pt-4 text-[11px] text-red-400/80 tracking-widest uppercase font-semibold">
            LOCKDOWN PROTOCOL ENFORCED • CANNOT BE DISMISSED
          </div>
        </div>
      </div>
    );
  }

  // Pre-game Warning Modal (Desktop Only)
  if (!acknowledged) {
    return (
      <>
        <DevToolsWarning onAcknowledge={handleAcknowledge} />
        <div className="filter blur-md pointer-events-none select-none h-screen w-screen overflow-hidden">
          {children}
        </div>
      </>
    );
  }

  // Standard Render (Desktop)
  return <>{children}</>;
}
