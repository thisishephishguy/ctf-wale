import React, { useState, useEffect, useRef } from 'react';

export default function Taskbar({
  openWindows = [],
  onWindowClick,
  teamName = 'CYBER_OPS',
  isAttacker = false,
  apps = [],
  onOpenApp,
  onSignOut
}) {
  const [time, setTime] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [shortDate, setShortDate] = useState('');
  const [startMenuOpen, setStartMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDateTooltip, setShowDateTooltip] = useState(false);

  const startMenuRef = useRef(null);
  const startBtnRef = useRef(null);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString([], {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        })
      );
      setDateStr(
        now.toLocaleDateString([], {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        })
      );
      setShortDate(
        now.toLocaleDateString([], {
          month: '2-digit',
          day: '2-digit',
          year: 'numeric'
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Close start menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        startMenuRef.current &&
        !startMenuRef.current.contains(e.target) &&
        startBtnRef.current &&
        !startBtnRef.current.contains(e.target)
      ) {
        setStartMenuOpen(false);
      }
    };
    if (startMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [startMenuOpen]);

  const handleSignOut = () => {
    if (onSignOut) {
      onSignOut();
    } else {
      window.location.href = '/';
    }
  };

  const filteredApps = apps.filter((app) =>
    app.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.shortTitle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {/* Windows 11 Start Menu Overlay */}
      {startMenuOpen && (
        <div
          ref={startMenuRef}
          className="absolute bottom-12 left-4 z-50 w-[440px] max-h-[580px] flex flex-col rounded-2xl border border-white/10 bg-slate-900/90 backdrop-blur-2xl shadow-2xl shadow-black/80 text-gray-200 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200"
        >
          {/* Header with Team / Identity Info */}
          <div className="p-4 pb-2 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center font-bold text-white shadow-md">
                {teamName ? teamName.charAt(0).toUpperCase() : 'T'}
              </div>
              <div>
                <div className="text-sm font-semibold text-white tracking-wide">{teamName}</div>
                <div className="text-[11px] text-gray-400 flex items-center space-x-1.5">
                  <span className={`w-2 h-2 rounded-full ${isAttacker ? 'bg-red-400 animate-pulse' : 'bg-emerald-400'}`} />
                  <span>{isAttacker ? 'Offensive Cyber Node' : 'Defense Cyber Node'}</span>
                </div>
              </div>
            </div>
            <div className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-white/5 border border-white/10 text-cyan-300">
              TRAZ OS v3.4
            </div>
          </div>

          {/* Cosmetic Search Bar */}
          <div className="px-4 pt-3 pb-2">
            <div className="relative flex items-center">
              <svg className="w-4 h-4 absolute left-3 text-gray-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type here to search apps, files, settings..."
                className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-sky-400/60 focus:border-sky-400/60 transition-all font-sans"
              />
            </div>
          </div>

          {/* Pinned Apps Section */}
          <div className="px-4 py-2 flex-1 overflow-y-auto">
            <div className="flex items-center justify-between pb-2">
              <span className="text-xs font-semibold text-gray-300">Pinned Apps</span>
              <span className="text-[10px] text-gray-500 uppercase tracking-wider">All Applications</span>
            </div>

            <div className="grid grid-cols-4 gap-2 pt-1">
              {filteredApps.map((app) => (
                <button
                  key={app.id}
                  onClick={() => {
                    onOpenApp?.(app.id);
                    setStartMenuOpen(false);
                  }}
                  className="flex flex-col items-center justify-center p-2 rounded-xl hover:bg-white/10 transition-colors group text-center cursor-pointer"
                  type="button"
                >
                  <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-black/20 group-hover:scale-105 transition-transform mb-1.5 drop-shadow">
                    {app.icon}
                  </div>
                  <span className="text-[11px] text-gray-300 group-hover:text-white font-medium truncate w-full">
                    {app.shortTitle}
                  </span>
                </button>
              ))}
            </div>

            {filteredApps.length === 0 && (
              <div className="py-8 text-center text-xs text-gray-500">
                No apps matched your search.
              </div>
            )}
          </div>

          {/* Bottom Footer: User and Sign Out */}
          <div className="p-3 bg-black/30 border-t border-white/5 flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs text-gray-400">
              <span className="font-medium text-gray-300">{teamName}</span>
              <span className="text-gray-600">•</span>
              <span className="text-[10px] text-gray-400 font-mono">Made by Taha</span>
            </div>

            <button
              onClick={handleSignOut}
              type="button"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-300 hover:text-white hover:bg-red-600/70 transition-colors border border-red-500/30"
              title="Sign Out of TRAZ OS"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Windows 11 Taskbar */}
      <div
        className={`h-11 border-t flex items-center justify-between px-3 z-50 select-none backdrop-blur-xl transition-colors relative ${
          isAttacker
            ? 'bg-[#121217]/85 border-red-900/40 text-red-200'
            : 'bg-[#181d28]/85 border-white/10 text-slate-200'
        }`}
      >
        {/* Left: Windows 11 Start Button */}
        <div className="flex items-center">
          <button
            ref={startBtnRef}
            type="button"
            onClick={() => setStartMenuOpen((prev) => !prev)}
            className={`group flex items-center justify-center w-9 h-9 rounded-md transition-all hover:bg-white/10 ${
              startMenuOpen ? 'bg-white/15' : ''
            }`}
            title="Start"
          >
            {/* Windows 4-Square Grid Logo */}
            <svg
              className="w-4 h-4 text-sky-400 group-hover:text-sky-300 transition-colors"
              viewBox="0 0 16 16"
              fill="currentColor"
            >
              <rect x="1" y="1" width="6" height="6" rx="0.5" />
              <rect x="9" y="1" width="6" height="6" rx="0.5" />
              <rect x="1" y="9" width="6" height="6" rx="0.5" />
              <rect x="9" y="9" width="6" height="6" rx="0.5" />
            </svg>
          </button>
        </div>

        {/* Center: Windows 11 Centered Task Icons & Running Windows */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center space-x-1 max-w-[65vw] overflow-x-auto py-1 scrollbar-none">
          {openWindows.map((win) => {
            const isActive = !win.minimized;
            return (
              <button
                key={win.id}
                type="button"
                onClick={() => onWindowClick?.(win.id)}
                className={`relative group flex items-center space-x-2 px-3 h-8 rounded-md text-xs font-sans max-w-[190px] truncate transition-all ${
                  isActive
                    ? 'bg-white/15 text-white shadow-sm'
                    : 'text-gray-400 hover:bg-white/10 hover:text-gray-200'
                }`}
                title={win.title}
              >
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    isActive
                      ? isAttacker
                        ? 'bg-red-400'
                        : 'bg-sky-400'
                      : 'bg-gray-500'
                  }`}
                />
                <span className="truncate">{win.title}</span>

                {/* Windows 11 Active App Underline Indicator */}
                {isActive && (
                  <span
                    className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full ${
                      isAttacker ? 'bg-red-400' : 'bg-sky-400'
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Right: Windows 11 System Tray (Network, Volume, Notification, Clock) */}
        <div className="flex items-center space-x-2">
          {/* Quick status cluster */}
          <div className="flex items-center space-x-2 px-2 py-1 rounded-md hover:bg-white/10 transition-colors cursor-pointer text-gray-300 hover:text-white">
            {/* Network Icon */}
            <svg
              className="w-3.5 h-3.5 text-gray-300 hover:text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              title="Internet Access: Connected"
            >
              <path d="M5 12.55a11 11 0 0 1 14.08 0" />
              <path d="M1.42 9a16 16 0 0 1 21.16 0" />
              <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
              <line x1="12" y1="20" x2="12.01" y2="20" strokeWidth="2.5" />
            </svg>

            {/* Volume Icon */}
            <svg
              className="w-3.5 h-3.5 text-gray-300 hover:text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              title="Speakers: 100%"
            >
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
            </svg>

            {/* Notification Bell */}
            <svg
              className="w-3.5 h-3.5 text-gray-300 hover:text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              title="Notifications"
            >
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </div>

          {/* Clock & Date Area */}
          <div
            className="relative flex flex-col items-end px-2 py-0.5 rounded-md hover:bg-white/10 transition-colors cursor-pointer text-right leading-tight select-none"
            onMouseEnter={() => setShowDateTooltip(true)}
            onMouseLeave={() => setShowDateTooltip(false)}
          >
            <span className="text-[11px] font-sans font-medium text-gray-200">
              {time || '12:00 PM'}
            </span>
            <span className="text-[10px] font-sans text-gray-400">
              {shortDate || '10/11/2026'}
            </span>

            {/* Date Tooltip on hover near clock */}
            {showDateTooltip && (
              <div className="absolute bottom-12 right-0 z-50 px-3 py-1.5 rounded-lg bg-slate-900/95 border border-white/10 text-white text-xs font-sans shadow-xl whitespace-nowrap pointer-events-none animate-in fade-in duration-150">
                <div className="font-semibold text-sky-400">{dateStr}</div>
                <div className="text-[10px] text-gray-400">TRAZ Synchronized Time</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
