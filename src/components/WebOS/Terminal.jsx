import React, { useState, useRef, useEffect } from 'react';

const INITIAL_FS = {
  '/home/user': {
    type: 'dir',
    children: ['notes.txt', 'network_targets.txt', 'recon.sh', 'downloads']
  },
  '/home/user/notes.txt': {
    type: 'file',
    content: '[SEC_MEMO]\nWorkstation security audit in progress.\nVerify local interface via `hostname -I`.'
  },
  '/home/user/network_targets.txt': {
    type: 'file',
    content: 'TARGET_SUBNET: 10.0.0.0/16\nINTERFACE: eth0 (active)'
  },
  '/home/user/recon.sh': {
    type: 'file',
    content: '#!/bin/bash\n# TRAZ Automated Recon Script\necho "[*] Scanning subnet interfaces..."\necho "[+] Gateway: 10.0.0.1 (UP)"'
  },
  '/home/user/downloads': {
    type: 'dir',
    children: ['payload_manifest.json']
  },
  '/home/user/downloads/payload_manifest.json': {
    type: 'file',
    content: '{\n  "payloads": ["cracker.bin", "malware.elf", "ransomware.py"],\n  "status": "staged"\n}'
  },
  '/etc': {
    type: 'dir',
    children: ['hosts', 'resolv.conf']
  },
  '/etc/hosts': {
    type: 'file',
    content: '127.0.0.1   localhost traz-workstation\n10.0.1.1    traz-gateway.internal'
  },
  '/etc/resolv.conf': {
    type: 'file',
    content: 'nameserver 1.1.1.1\nnameserver 8.8.8.8'
  },
  '/var': {
    type: 'dir',
    children: ['log']
  },
  '/var/log': {
    type: 'dir',
    children: ['auth.log']
  },
  '/var/log/auth.log': {
    type: 'file',
    content: 'Oct 11 04:12:09 traz-os sshd[1042]: Accepted publickey for operative from 10.0.0.12'
  }
};

export default function Terminal({ teamId = 'team-alpha', isAttacker = false }) {
  const [currentDir, setCurrentDir] = useState('/home/user');
  const [history, setHistory] = useState([
    {
      type: 'system',
      text: `TRAZ OS v3.4.1 (x86_64-pc-traz-cyber) - Kernel 6.8.0-traz\nWelcome to TRAZ Cybersecurity CTF Terminal.\nType 'help' for available system commands.`
    }
  ]);
  const [cmdInput, setCmdInput] = useState('');
  const [commandHistory, setCommandHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const terminalEndRef = useRef(null);
  const inputRef = useRef(null);

  const calculateTargetIP = (id) => {
    const safeId = String(id || 'traz');
    const c0 = safeId.charCodeAt(0) || 65;
    const c1 = safeId.length > 1 ? safeId.charCodeAt(1) : 66;
    return `10.0.${c0 % 256}.${c1 % 256}`;
  };

  const currentIP = calculateTargetIP(teamId);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      executeCommand(cmdInput.trim());
      if (cmdInput.trim()) {
        setCommandHistory((prev) => [...prev, cmdInput.trim()]);
      }
      setHistoryIndex(-1);
      setCmdInput('');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length === 0) return;
      const nextIndex = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(nextIndex);
      setCmdInput(commandHistory[nextIndex]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex === -1) return;
      const nextIndex = historyIndex + 1;
      if (nextIndex >= commandHistory.length) {
        setHistoryIndex(-1);
        setCmdInput('');
      } else {
        setHistoryIndex(nextIndex);
        setCmdInput(commandHistory[nextIndex]);
      }
    }
  };

  const resolvePath = (path) => {
    if (!path || path === '.') return currentDir;
    if (path === '~') return '/home/user';
    if (path.startsWith('~/')) return `/home/user/${path.slice(2)}`;
    if (path.startsWith('/')) return path;

    if (path === '..') {
      const parts = currentDir.split('/').filter(Boolean);
      parts.pop();
      return '/' + parts.join('');
    }

    const trimmedCurrent = currentDir.endsWith('/') ? currentDir.slice(0, -1) : currentDir;
    return `${trimmedCurrent}/${path}`;
  };

  const executeCommand = (rawCommand) => {
    if (!rawCommand) {
      setHistory((prev) => [...prev, { type: 'input', text: '', dir: currentDir }]);
      return;
    }

    const promptEntry = { type: 'input', text: rawCommand, dir: currentDir };
    const parts = rawCommand.split(' ').filter(Boolean);
    const cmd = parts[0];
    const args = parts.slice(1);

    let output = '';

    switch (cmd) {
      case 'help':
        output = `Available TRAZ Terminal Commands:
  hostname -I   Show assigned network IP address
  ifconfig      Display network interfaces and IP configurations
  whoami        Print effective current user identity
  pwd           Print current working directory
  ls            List contents of current directory
  cd <dir>      Change directory (e.g. cd downloads, cd ..)
  cat <file>    Concatenate and display content of file
  clear         Clear the terminal screen buffer
  help          Display this help manual`;
        break;

      case 'hostname':
        if (args.includes('-I') || args.includes('-i')) {
          output = currentIP;
        } else {
          output = isAttacker ? 'traz-attack-node' : 'traz-workstation-01';
        }
        break;

      case 'ifconfig':
        output = `eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500
        inet ${currentIP}  netmask 255.255.0.0  broadcast 10.0.255.255
        inet6 fe80::a00:27ff:fe4a:37b2  prefixlen 64  scopeid 0x20<link>
        ether 08:00:27:4a:37:b2  txqueuelen 1000  (Ethernet)
        RX packets 24088  bytes 23091244 (23.0 MB)
        TX packets 19830  bytes 18239021 (18.2 MB)

lo: flags=73<UP,LOOPBACK,RUNNING>  mtu 65536
        inet 127.0.0.1  netmask 255.0.0.0`;
        break;

      case 'whoami':
        output = isAttacker ? 'root@redteam-breach' : 'operative@traz-sec';
        break;

      case 'pwd':
        output = currentDir;
        break;

      case 'ls': {
        const targetDirPath = args[0] ? resolvePath(args[0]) : currentDir;
        const entry = INITIAL_FS[targetDirPath];
        if (entry && entry.type === 'dir') {
          output = entry.children.join('  ');
        } else if (entry && entry.type === 'file') {
          output = args[0];
        } else {
          output = `ls: cannot access '${args[0] || targetDirPath}': No such file or directory`;
        }
        break;
      }

      case 'cd': {
        const target = args[0];
        if (!target || target === '~') {
          setCurrentDir('/home/user');
        } else {
          const resolved = resolvePath(target);
          if (INITIAL_FS[resolved] && INITIAL_FS[resolved].type === 'dir') {
            setCurrentDir(resolved === '' ? '/' : resolved);
          } else {
            output = `cd: ${target}: No such file or directory`;
          }
        }
        break;
      }

      case 'cat': {
        if (!args[0]) {
          output = 'cat: missing file operand';
        } else {
          const resolved = resolvePath(args[0]);
          const file = INITIAL_FS[resolved];
          if (file && file.type === 'file') {
            output = file.content;
          } else if (file && file.type === 'dir') {
            output = `cat: ${args[0]}: Is a directory`;
          } else {
            output = `cat: ${args[0]}: No such file or directory`;
          }
        }
        break;
      }

      case 'clear':
        setHistory([]);
        return;

      default:
        output = `command not found: ${cmd}`;
        break;
    }

    setHistory((prev) => [
      ...prev,
      promptEntry,
      ...(output ? [{ type: 'output', text: output }] : [])
    ]);
  };

  const formatDir = (dir) => {
    if (dir === '/home/user') return '~';
    if (dir.startsWith('/home/user/')) return '~/' + dir.slice('/home/user/'.length);
    return dir;
  };

  const promptUser = isAttacker ? 'root' : 'user';
  const promptHost = 'traz';
  const promptSymbol = isAttacker ? '#' : '$';

  return (
    <div
      onClick={() => inputRef.current?.focus()}
      className="h-full w-full bg-black font-mono text-sm p-4 flex flex-col overflow-hidden text-emerald-400 select-text cursor-text"
    >
      {/* Scrollable Command Area */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-2 scrollbar-thin scrollbar-thumb-emerald-900 scrollbar-track-transparent">
        {history.map((item, idx) => {
          if (item.type === 'system') {
            return (
              <div key={idx} className="text-emerald-500/80 whitespace-pre-wrap leading-relaxed mb-2 font-mono text-xs">
                {item.text}
              </div>
            );
          }
          if (item.type === 'input') {
            return (
              <div key={idx} className="flex items-start space-x-2">
                <span className="text-emerald-300 font-semibold select-none whitespace-nowrap">
                  {promptUser}@{promptHost}:{formatDir(item.dir)}{promptSymbol}
                </span>
                <span className="text-emerald-100 font-normal break-all">{item.text}</span>
              </div>
            );
          }
          return (
            <div key={idx} className="text-emerald-400/90 whitespace-pre-wrap leading-normal pl-1">
              {item.text}
            </div>
          );
        })}
        <div ref={terminalEndRef} />
      </div>

      {/* Input Row at bottom */}
      <div className="pt-2 border-t border-emerald-950 flex items-center space-x-2 text-emerald-300">
        <span className="font-semibold select-none whitespace-nowrap">
          {promptUser}@{promptHost}:{formatDir(currentDir)}{promptSymbol}
        </span>
        <div className="flex-1 relative flex items-center">
          <input
            ref={inputRef}
            type="text"
            value={cmdInput}
            onChange={(e) => setCmdInput(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            spellCheck={false}
            autoComplete="off"
            className="w-full bg-transparent outline-none text-emerald-100 font-mono text-sm caret-emerald-400 border-none p-0 focus:ring-0"
          />
          {/* Animated Blinking Cursor Simulation if input is unfocused or empty */}
          <span className="inline-block w-2 h-4 bg-emerald-400 animate-pulse ml-0.5 pointer-events-none" />
        </div>
      </div>
    </div>
  );
}
