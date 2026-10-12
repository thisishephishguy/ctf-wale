import React, { useState, useRef, useEffect } from 'react';

class WindowErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('[Window Error]', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full w-full bg-slate-950 p-6 font-mono text-red-400 flex flex-col justify-center items-center text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-red-950/80 border border-red-500 flex items-center justify-center text-red-400 text-lg">
            ⚠
          </div>
          <div className="text-sm font-bold text-red-300">Application Module Error</div>
          <div className="text-xs text-gray-400 max-w-sm break-words">{this.state.error?.message || 'Module encountered an unexpected exception.'}</div>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-3 py-1 bg-red-900/60 hover:bg-red-800 border border-red-500 rounded text-xs text-white cursor-pointer"
          >
            Reload Module
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function Window({
  id,
  title,
  onClose,
  onMinimize,
  onFocus,
  zIndex = 10,
  width = 680,
  height = 460,
  isAttack = false,
  children
}) {
  const initialWidth = typeof width === 'number' ? width : 680;
  const initialHeight = typeof height === 'number' ? height : 460;

  // Center roughly in viewport by default with offset for cascaded windows
  const [pos, setPos] = useState(() => {
    const defaultX = Math.max(40, Math.floor((window.innerWidth - initialWidth) / 2) + ((id.charCodeAt?.(0) || 0) % 60));
    const defaultY = Math.max(40, Math.floor((window.innerHeight - initialHeight) / 2) - 30 + ((id.charCodeAt?.(1) || 0) % 40));
    return { x: defaultX, y: defaultY };
  });

  const [size, setSize] = useState({ width: initialWidth, height: initialHeight });
  const [isMaximized, setIsMaximized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  const prevDimensions = useRef({ pos: { x: 40, y: 40 }, size: { width: initialWidth, height: initialHeight } });
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const resizeRef = useRef({ startX: 0, startY: 0, startW: 0, startH: 0 });

  const handleMouseDown = (e) => {
    // Only drag when clicking the titlebar, not controls
    if (e.target.closest('.window-control-btn')) return;
    if (isMaximized) return;
    setIsDragging(true);
    dragOffsetRef.current = {
      x: e.clientX - pos.x,
      y: e.clientY - pos.y
    };
    onFocus?.();
  };

  const toggleMaximize = (e) => {
    e?.stopPropagation();
    if (isMaximized) {
      setPos(prevDimensions.current.pos);
      setSize(prevDimensions.current.size);
      setIsMaximized(false);
    } else {
      prevDimensions.current = { pos: { ...pos }, size: { ...size } };
      setPos({ x: 0, y: 0 });
      setSize({
        width: window.innerWidth,
        height: Math.max(300, window.innerHeight - 44) // leaves taskbar visible
      });
      setIsMaximized(true);
    }
    onFocus?.();
  };

  const handleResizeStart = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (isMaximized) return;
    setIsResizing(true);
    resizeRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startW: size.width,
      startH: size.height
    };
    onFocus?.();
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging) {
        const newX = Math.max(0, Math.min(window.innerWidth - 120, e.clientX - dragOffsetRef.current.x));
        const newY = Math.max(0, Math.min(window.innerHeight - 80, e.clientY - dragOffsetRef.current.y));
        setPos({ x: newX, y: newY });
      } else if (isResizing) {
        const deltaX = e.clientX - resizeRef.current.startX;
        const deltaY = e.clientY - resizeRef.current.startY;
        const newW = Math.max(360, Math.min(window.innerWidth - pos.x, resizeRef.current.startW + deltaX));
        const newH = Math.max(240, Math.min(window.innerHeight - pos.y - 44, resizeRef.current.startH + deltaY));
        setSize({ width: newW, height: newH });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, pos.x, pos.y]);

  return (
    <div
      onClick={onFocus}
      style={{
        transform: `translate3d(${pos.x}px, ${pos.y}px, 0)`,
        width: isMaximized ? '100vw' : `${size.width}px`,
        height: isMaximized ? 'calc(100vh - 44px)' : `${size.height}px`,
        zIndex: zIndex
      }}
      className={`absolute top-0 left-0 flex flex-col ${
        isMaximized ? 'rounded-none border-0' : 'rounded-lg border'
      } overflow-hidden shadow-2xl shadow-black/80 drop-shadow-2xl backdrop-blur-xl ${
        isAttack
          ? 'border-red-500/40 bg-neutral-950/95 ring-1 ring-red-500/20'
          : 'border-slate-700/60 bg-slate-950/95 ring-1 ring-cyan-500/20'
      } select-none transition-shadow duration-150`}
    >
      {/* Windows 11 Style Title Bar */}
      <div
        onMouseDown={handleMouseDown}
        onDoubleClick={toggleMaximize}
        className={`h-9 flex items-center justify-between select-none cursor-default border-b ${
          isMaximized ? 'rounded-none' : 'rounded-t-lg'
        } ${
          isAttack
            ? 'bg-neutral-900/90 border-red-900/50 text-red-100'
            : 'bg-slate-900/90 border-slate-800 text-slate-200'
        }`}
      >
        {/* Left: Window Title & Status Indicator */}
        <div className="flex items-center space-x-2 px-3 truncate flex-1 min-w-0">
          <span
            className={`w-2 h-2 rounded-full flex-shrink-0 ${
              isAttack ? 'bg-red-500 shadow-sm shadow-red-500' : 'bg-cyan-400 shadow-sm shadow-cyan-400'
            }`}
          />
          <span className="font-sans text-xs font-medium tracking-wide truncate text-gray-200">
            {title}
          </span>
          {isAttack && (
            <span className="text-[9px] uppercase font-bold tracking-wider bg-red-950/80 text-red-400 px-1.5 py-0.5 rounded border border-red-800/60">
              TARGET NODE
            </span>
          )}
        </div>

        {/* Right: Windows 11 Window Control Buttons */}
        <div className="flex items-center h-full">
          {onMinimize && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMinimize();
              }}
              className="window-control-btn w-11 h-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Minimize"
              type="button"
            >
              <svg className="w-3 h-3" viewBox="0 0 10 1" fill="currentColor">
                <rect width="10" height="1" rx="0.5" />
              </svg>
            </button>
          )}

          <button
            onClick={toggleMaximize}
            className="window-control-btn w-11 h-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            title={isMaximized ? 'Restore Down' : 'Maximize'}
            type="button"
          >
            {isMaximized ? (
              <svg className="w-3 h-3" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
                <rect x="2.5" y="0.5" width="7" height="7" rx="0.5" />
                <path d="M0.5 2.5 H7.5 V9.5 H0.5 Z" />
              </svg>
            ) : (
              <svg className="w-3 h-3" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
                <rect x="0.5" y="0.5" width="9" height="9" rx="0.5" />
              </svg>
            )}
          </button>

          {onClose && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className={`window-control-btn w-11 h-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-[#e81123] transition-colors ${
                !isMaximized ? 'rounded-tr-lg' : ''
              }`}
              title="Close"
              type="button"
            >
              <svg className="w-3 h-3" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2">
                <line x1="1" y1="1" x2="9" y2="9" />
                <line x1="9" y1="1" x2="1" y2="9" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Window Body with subtle rounded bottom corners */}
      <div className={`flex-1 overflow-auto bg-black/70 relative select-text font-sans ${isMaximized ? 'rounded-none' : 'rounded-b-lg'}`}>
        <WindowErrorBoundary>
          {children}
        </WindowErrorBoundary>
      </div>

      {/* Resize Handle at bottom-right corner */}
      {!isMaximized && (
        <div
          onMouseDown={handleResizeStart}
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize flex items-end justify-end p-0.5 z-30 group"
          title="Resize"
        >
          <svg className="w-2.5 h-2.5 text-gray-500/50 group-hover:text-cyan-400 transition-colors" viewBox="0 0 6 6" fill="currentColor">
            <circle cx="5" cy="5" r="0.8" />
            <circle cx="5" cy="2.5" r="0.8" />
            <circle cx="2.5" cy="5" r="0.8" />
          </svg>
        </div>
      )}
    </div>
  );
}
