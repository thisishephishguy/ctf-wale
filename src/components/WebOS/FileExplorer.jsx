import React, { useState, useEffect, useRef } from 'react';
import supabase from '../../lib/supabase';

const FOLDERS = [
  'Home',
  'Desktop',
  'Documents',
  'Downloads',
  'System',
  'Projects',
  'Archives',
  'Backups',
  'Temp'
];

const STATIC_FILES_BY_FOLDER = {
  Home: [
    { id: 'h1', name: 'readme.txt', type: 'doc', size: '1.2 KB', modified: '2026-10-10' },
    { id: 'h2', name: 'profile.dat', type: 'doc', size: '3.4 KB', modified: '2026-10-11' }
  ],
  Desktop: [
    { id: 'dt1', name: 'security_policy.pdf', type: 'doc', size: '142 KB', modified: '2026-10-09' }
  ],
  Documents: [
    { id: 'dc1', name: 'network_topology.docx', type: 'doc', size: '48 KB', modified: '2026-10-08' },
    { id: 'dc2', name: 'audit_log_layer2.txt', type: 'doc', size: '12 KB', modified: '2026-10-11' }
  ],
  Downloads: [],
  System: [
    { id: 's1', name: 'kernel_headers.sys', type: 'doc', size: '1.8 MB', modified: '2026-10-01' },
    { id: 's2', name: 'firewall_rules.conf', type: 'doc', size: '4.2 KB', modified: '2026-10-11' }
  ],
  Projects: [
    { id: 'p1', name: 'payload_gen.py', type: 'doc', size: '8.5 KB', modified: '2026-10-10' },
    { id: 'p2', name: 'target_scanner.c', type: 'doc', size: '14 KB', modified: '2026-10-11' }
  ],
  Archives: [
    { id: 'a1', name: 'system_backup.tar.gz', type: 'doc', size: '24.1 MB', modified: '2026-10-05' }
  ],
  Backups: [
    { id: 'b1', name: 'db_snapshot.sql', type: 'doc', size: '6.7 MB', modified: '2026-10-11' }
  ],
  Temp: [
    { id: 't1', name: 'session_cache.tmp', type: 'doc', size: '22 KB', modified: '2026-10-11' }
  ]
};

export default function FileExplorer({ teamId = 'team-alpha', isAttacker = false, attackerTeamId }) {
  const [currentFolder, setCurrentFolder] = useState('Documents');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [droppedFiles, setDroppedFiles] = useState([]);
  const [stegoFiles, setStegoFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [clipboardFile, setClipboardFile] = useState(null);
  const [contextMenu, setContextMenu] = useState(null); // { x, y, file, isBackground }
  const [modalInfo, setModalInfo] = useState(null); // { title, content, file, isCracker }
  const [runningPayload, setRunningPayload] = useState(false);
  const [payloadProgress, setPayloadProgress] = useState(0);
  const [payloadStatus, setPayloadStatus] = useState('');
  const [payloadError, setPayloadError] = useState('');

  const fileExplorerRef = useRef(null);

  // Normalize dropped file items from team_state.files_dropped
  const normalizeDroppedItem = (item, idx) => {
    if (typeof item === 'string') {
      const lower = item.toLowerCase();
      let type = 'tool';
      if (lower.includes('png') || lower.includes('jpg') || lower.includes('svg') || lower.includes('stego')) type = 'image';
      return {
        id: `drop-${idx}-${item}`,
        name: item.includes('.') ? item : `${item}.bin`,
        toolType: lower,
        folder: 'Downloads',
        type: type,
        size: '64.0 KB',
        modified: new Date().toISOString().split('T')[0],
        isDropped: true
      };
    }
    return {
      id: item.id || `drop-${idx}-${item.name}`,
      name: item.name || 'transmitted_payload.bin',
      toolType: item.toolType || item.name || 'tool',
      folder: item.folder || 'Downloads',
      type: item.type || 'tool',
      size: item.size || '64.0 KB',
      modified: item.modified || new Date().toISOString().split('T')[0],
      isDropped: true
    };
  };

  // Fetch dropped files & stego fragments from Supabase
  useEffect(() => {
    let isSubscribed = true;

    async function fetchFiles() {
      if (!teamId) return;
      try {
        // 1. Fetch team_state for dropped files
        const { data: stateData, error: stateErr } = await supabase
          .from('team_state')
          .select('files_dropped')
          .eq('team_id', teamId)
          .maybeSingle();

        if (stateErr) {
          console.warn('Error fetching team_state in FileExplorer:', stateErr);
        }

        if (stateData && Array.isArray(stateData.files_dropped) && isSubscribed) {
          const parsed = stateData.files_dropped.map(normalizeDroppedItem);
          setDroppedFiles(parsed);
        }

        // 2. Fetch stego_fragments for this team
        const { data: fragData, error: fragErr } = await supabase
          .from('stego_fragments')
          .select('*')
          .eq('team_id', teamId);

        if (isSubscribed) {
          if (!fragErr && fragData && fragData.length > 0) {
            const mapped = fragData.map((f, idx) => {
              const imgIndex = f.image_index ?? idx;
              return {
                id: `stego-${f.id || idx}`,
                name: `fragment_${imgIndex}.svg`,
                toolType: 'image',
                folder: f.folder_name || 'Documents',
                type: 'image',
                size: '14.2 KB',
                modified: '2026-10-11',
                imgSrc: `/stego/image${imgIndex}.svg`,
                isStego: true,
                imageIndex: imgIndex,
                word: f.word || '',
                orderMarker: f.order_marker ?? (idx + 1)
              };
            });
            setStegoFiles(mapped);
          } else {
            // Sensible fallback based on standard CTF config
            const fallback = [
              { id: 'stego-fb-0', name: 'fragment_0.svg', toolType: 'image', folder: 'Documents', type: 'image', size: '14.2 KB', modified: '2026-10-11', imgSrc: '/stego/image0.svg', isStego: true, imageIndex: 0 },
              { id: 'stego-fb-1', name: 'fragment_1.svg', toolType: 'image', folder: 'Documents', type: 'image', size: '14.2 KB', modified: '2026-10-11', imgSrc: '/stego/image1.svg', isStego: true, imageIndex: 1 },
              { id: 'stego-fb-2', name: 'fragment_2.svg', toolType: 'image', folder: 'Documents', type: 'image', size: '14.2 KB', modified: '2026-10-11', imgSrc: '/stego/image2.svg', isStego: true, imageIndex: 2 },
              { id: 'stego-fb-3', name: 'fragment_3.svg', toolType: 'image', folder: 'Projects', type: 'image', size: '14.2 KB', modified: '2026-10-11', imgSrc: '/stego/image3.svg', isStego: true, imageIndex: 3 },
              { id: 'stego-fb-4', name: 'fragment_4.svg', toolType: 'image', folder: 'Archives', type: 'image', size: '14.2 KB', modified: '2026-10-11', imgSrc: '/stego/image4.svg', isStego: true, imageIndex: 4 },
              { id: 'stego-fb-5', name: 'fragment_5.svg', toolType: 'image', folder: 'Temp', type: 'image', size: '14.2 KB', modified: '2026-10-11', imgSrc: '/stego/image5.svg', isStego: true, imageIndex: 5 }
            ];
            setStegoFiles(fallback);
          }
        }
      } catch (err) {
        console.error('Supabase query exception in FileExplorer:', err);
      }
    }

    fetchFiles();

    // Realtime Subscription
    const channel = supabase
      .channel(`team_state_files_${teamId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'team_state', filter: `team_id=eq.${teamId}` },
        (payload) => {
          if (payload.new && Array.isArray(payload.new.files_dropped)) {
            const parsed = payload.new.files_dropped.map(normalizeDroppedItem);
            setDroppedFiles(parsed);
          }
        }
      )
      .subscribe();

    return () => {
      isSubscribed = false;
      supabase.removeChannel(channel);
    };
  }, [teamId]);

  // Persist updated dropped files back to Supabase
  const syncDroppedFilesToSupabase = async (updatedList) => {
    setDroppedFiles(updatedList);
    try {
      await supabase
        .from('team_state')
        .update({ files_dropped: updatedList })
        .eq('team_id', teamId);
    } catch (err) {
      console.error('Failed to sync files_dropped to Supabase:', err);
    }
  };

  // Current folder files
  const staticFiles = STATIC_FILES_BY_FOLDER[currentFolder] || [];
  const currentDroppedFiles = droppedFiles.filter((f) => (f.folder || 'Downloads') === currentFolder);
  const currentStegoFiles = stegoFiles.filter((f) => (f.folder || 'Documents') === currentFolder);
  const allFilesInFolder = [...staticFiles, ...currentDroppedFiles, ...currentStegoFiles];

  // Context Menu handlers
  const handleContextMenu = (e, file = null) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = fileExplorerRef.current?.getBoundingClientRect() || { left: 0, top: 0 };
    setContextMenu({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      file: file,
      isBackground: !file
    });
    if (file) {
      setSelectedFile(file);
    }
  };

  const closeContextMenu = () => {
    setContextMenu(null);
  };

  // Drag and drop handling
  const handleDragStart = (e, file) => {
    e.dataTransfer.setData('text/plain', JSON.stringify(file));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDropOnFolder = (e, targetFolder) => {
    e.preventDefault();
    try {
      const dataStr = e.dataTransfer.getData('text/plain');
      if (!dataStr) return;
      const file = JSON.parse(dataStr);
      moveFileToFolder(file, targetFolder);
    } catch (err) {
      console.error('Drop error:', err);
    }
  };

  const moveFileToFolder = (file, targetFolder) => {
    if (!file) return;
    if (file.isDropped) {
      const updated = droppedFiles.map((f) =>
        f.id === file.id ? { ...f, folder: targetFolder } : f
      );
      syncDroppedFilesToSupabase(updated);
    } else if (file.isStego) {
      // Stego files update in local state
      setStegoFiles((prev) =>
        prev.map((f) => (f.id === file.id ? { ...f, folder: targetFolder } : f))
      );
    } else {
      // If it's a static file, move it as dropped item
      const newDropped = {
        ...file,
        folder: targetFolder,
        isDropped: true
      };
      syncDroppedFilesToSupabase([...droppedFiles, newDropped]);
    }
  };

  // File action menus
  const handleCut = (file) => {
    setClipboardFile(file || selectedFile);
    closeContextMenu();
  };

  const handlePaste = () => {
    if (clipboardFile) {
      moveFileToFolder(clipboardFile, currentFolder);
      setClipboardFile(null);
    }
    closeContextMenu();
  };

  const handleDelete = (file) => {
    const target = file || selectedFile;
    if (!target) return;
    if (target.isDropped) {
      const updated = droppedFiles.filter((f) => f.id !== target.id);
      syncDroppedFilesToSupabase(updated);
    } else if (target.isStego) {
      setStegoFiles((prev) => prev.filter((f) => f.id !== target.id));
    }
    setSelectedFile(null);
    closeContextMenu();
  };

  // Open file / Preview modal
  const handleOpenFile = (file) => {
    const target = file || selectedFile;
    if (!target) return;
    closeContextMenu();

    let details = `File: ${target.name}\nSize: ${target.size}\nModified: ${target.modified}\nDirectory: /home/user/${target.folder || currentFolder}`;

    const isCracker =
      (target.toolType && target.toolType.toLowerCase().includes('cracker')) ||
      (target.name && target.name.toLowerCase().includes('cracker'));

    if (isCracker) {
      details += `\n\n[EXECUTABLE ZERO-DAY PAYLOAD: CRACKER]\nStatus: Ready for execution.\nPayload target: Application Privilege & Subsystem ACLs.\nFunction: Nullifies app lockdown on target node.\n\nClick "RUN CRACKER" below to execute.`;
    } else if (target.type === 'tool') {
      details += `\n\n[EXECUTABLE PAYLOAD]\nTool Identifier: ${target.toolType || target.name}\nStatus: Ready for execution or lateral movement.\nPrivileges: Elevated`;
    } else if (target.type === 'image') {
      details += `\n\n[STEGANOGRAPHY FORENSIC ASSET]\nFormat: Scalable Vector Graphics (SVG)\nClassification: Embedded Carrier Image.`;
    } else {
      details += `\n\n[TEXT CONTENT]\nFile content preview:\n---\nConfidential operative logs. All operations logged under TRAZ security protocol.`;
    }

    setModalInfo({
      title: target.name,
      content: details,
      file: target,
      isCracker: isCracker
    });
  };

  const handleExecuteCracker = async () => {
    setPayloadError('');
    setPayloadStatus('Probing target security descriptors...');
    setRunningPayload(true);
    setPayloadProgress(15);

    try {
      // 1. Check cooldown
      const { data: st } = await supabase
        .from('team_state')
        .select('cracker_cooldown_until, apps_locked')
        .eq('team_id', teamId)
        .maybeSingle();

      if (st?.cracker_cooldown_until && new Date(st.cracker_cooldown_until).getTime() > Date.now()) {
        const remaining = Math.ceil((new Date(st.cracker_cooldown_until).getTime() - Date.now()) / 1000);
        setRunningPayload(false);
        setPayloadError(`Cracker blocked by defense lockout! Cooldown active: ${remaining}s remaining.`);
        return;
      }

      setPayloadProgress(40);
      setPayloadStatus('Injecting heap buffer exploit into PAM subsystem...');
      await new Promise((r) => setTimeout(r, 600));

      setPayloadProgress(75);
      setPayloadStatus('Overwriting ACL permissions and nullifying app sandbox...');
      await new Promise((r) => setTimeout(r, 700));

      setPayloadProgress(95);
      setPayloadStatus('Finalizing post-exploitation unlock routine...');

      // Update Supabase
      const { error: unlockErr } = await supabase
        .from('team_state')
        .update({ apps_locked: false })
        .eq('team_id', teamId);

      if (unlockErr) {
        console.error('Error unlocking apps:', unlockErr);
      }

      // Defense alert for defender
      await supabase.from('defense_alerts').insert([
        {
          team_id: teamId,
          alert_type: 'application',
          triggered_at: new Date().toISOString(),
          responded: false
        }
      ]);

      // Layer progress for Layer 3 (Application Security)
      const effAttackerId =
        (attackerTeamId && attackerTeamId !== 'team-alpha')
          ? attackerTeamId
          : sessionStorage.getItem('traz_attacker_team_id') ||
            sessionStorage.getItem('traz_team_id');

      if (effAttackerId && effAttackerId !== 'team-alpha') {
        let activeGameId = null;
        const { data: teamInfo } = await supabase.from('teams').select('game_id').eq('id', effAttackerId).maybeSingle();
        activeGameId = teamInfo?.game_id;
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
            .eq('layer_number', 3)
            .maybeSingle();

          if (existingRow?.started_at) {
            startedIso = existingRow.started_at;
            durationSec = Math.max(1, Math.floor((Date.now() - new Date(existingRow.started_at).getTime()) / 1000));
          }

          const { error: lpErr } = await supabase.from('layer_progress').upsert({
            game_id: activeGameId,
            attacker_team_id: effAttackerId,
            layer_number: 3,
            started_at: startedIso,
            completed_at: new Date().toISOString(),
            duration_seconds: durationSec
          }, { onConflict: 'game_id,attacker_team_id,layer_number' });

          if (lpErr) {
            console.error('[FileExplorer] Layer 3 upsert error:', lpErr);
          } else {
            console.log('[FileExplorer] Layer 3 progress recorded with duration:', durationSec);
          }
        } else {
          console.error('[FileExplorer] activeGameId missing, cannot record Layer 3');
        }
      }

      setPayloadProgress(100);
      setPayloadStatus('SUCCESS: Target applications unlocked! Restriction neutralized.');
      setTimeout(() => {
        setRunningPayload(false);
        setModalInfo(null);
      }, 1400);
    } catch (err) {
      console.error('Cracker execution failed:', err);
      setRunningPayload(false);
      setPayloadError(`Execution failure: ${err.message || 'Unknown error'}`);
    }
  };

  const handleProperties = (file) => {
    const target = file || selectedFile;
    if (!target) return;
    closeContextMenu();
    setModalInfo({
      title: `Properties: ${target.name}`,
      content: `Name: ${target.name}\nType: ${target.type.toUpperCase()}\nLocation: /${target.folder || currentFolder}/${target.name}\nSize: ${target.size || '14.2 KB'}\nPermissions: -rw-r--r-- (0644)\nOwner: ${isAttacker ? 'root' : 'user'}\nTeam: ${teamId}`,
      file: target
    });
  };

  // Thumbnail / Icon Renderer
  const renderIcon = (file) => {
    const type = file.type;
    const nameLower = (file.name || '').toLowerCase();
    const isMalware = type === 'tool' || nameLower.includes('malware') || nameLower.includes('cracker') || nameLower.includes('ransomware');

    if (isMalware) {
      return (
        <svg className="w-10 h-10 text-red-500 drop-shadow-md" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          <circle cx="12" cy="12" r="4" fill="currentColor" fillOpacity="0.2" />
        </svg>
      );
    }

    // Thumbnail preview for stego images
    if (type === 'image' || file.imgSrc || nameLower.endsWith('.svg') || nameLower.endsWith('.png')) {
      const src = file.imgSrc || (nameLower.includes('fragment_') ? `/stego/image${nameLower.replace(/\D/g, '')}.svg` : null);
      if (src) {
        return (
          <div className="w-11 h-11 rounded-md bg-[#0a0a0a] border border-cyan-500/40 overflow-hidden flex items-center justify-center p-0.5 shadow-md group-hover:border-cyan-400">
            <img
              src={src}
              alt={file.name}
              className="w-full h-full object-contain"
              loading="lazy"
            />
          </div>
        );
      }

      return (
        <svg className="w-10 h-10 text-emerald-400 drop-shadow-md" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      );
    }

    // Default Document Icon
    return (
      <svg className="w-10 h-10 text-blue-400 drop-shadow-md" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    );
  };

  return (
    <div
      ref={fileExplorerRef}
      onClick={closeContextMenu}
      onContextMenu={(e) => handleContextMenu(e, null)}
      className="h-full w-full flex flex-col bg-slate-950 text-gray-200 font-sans select-none relative overflow-hidden"
    >
      {/* Top Breadcrumb & Control Toolbar */}
      <div className="h-10 px-3 bg-slate-900/80 border-b border-cyan-900/40 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2 text-gray-400">
          <svg className="w-4 h-4 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
          <span className="text-gray-500">root</span>
          <span>/</span>
          <span className="text-cyan-400 font-mono font-medium">{currentFolder}</span>
          {clipboardFile && (
            <span className="ml-3 px-2 py-0.5 rounded bg-amber-950/80 border border-amber-500/50 text-amber-300 text-[10px]">
              Cut: {clipboardFile.name} (Right-click to Paste)
            </span>
          )}
        </div>

        {/* View Toggle */}
        <div className="flex items-center space-x-1">
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`p-1 rounded ${viewMode === 'grid' ? 'bg-cyan-900/60 text-cyan-200' : 'text-gray-400 hover:bg-slate-800'}`}
            title="Grid View"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`p-1 rounded ${viewMode === 'list' ? 'bg-cyan-900/60 text-cyan-200' : 'text-gray-400 hover:bg-slate-800'}`}
            title="List View"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main Body: Sidebar + File List */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-44 bg-slate-900/40 border-r border-cyan-900/30 p-2 overflow-y-auto space-y-1">
          <div className="text-[10px] uppercase font-bold text-gray-500 px-2 py-1 tracking-wider">
            Directories
          </div>
          {FOLDERS.map((folder) => {
            const isActive = currentFolder === folder;
            const stegoInFolder = stegoFiles.filter((f) => f.folder === folder).length;
            const droppedInFolder = droppedFiles.filter((f) => (f.folder || 'Downloads') === folder).length;

            return (
              <button
                key={folder}
                type="button"
                onClick={() => setCurrentFolder(folder)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDropOnFolder(e, folder)}
                className={`w-full flex items-center space-x-2 px-2 py-1.5 rounded text-xs transition-all text-left ${
                  isActive
                    ? 'bg-cyan-950/80 border border-cyan-500/50 text-cyan-200 font-semibold shadow-inner'
                    : 'text-gray-300 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <svg className="w-4 h-4 text-amber-400 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
                </svg>
                <span className="truncate">{folder}</span>

                {stegoInFolder > 0 && (
                  <span className="ml-auto text-[9px] bg-purple-600/80 text-white font-mono px-1.5 py-0.2 rounded-full" title="Stego images">
                    {stegoInFolder}
                  </span>
                )}
                {droppedInFolder > 0 && stegoInFolder === 0 && (
                  <span className="ml-auto text-[9px] bg-red-600/80 text-white font-mono px-1.5 py-0.2 rounded-full">
                    {droppedInFolder}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Main Content Area */}
        <div
          className="flex-1 p-4 overflow-y-auto"
          onDragOver={handleDragOver}
          onDrop={(e) => handleDropOnFolder(e, currentFolder)}
        >
          {allFilesInFolder.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 text-xs space-y-2">
              <svg className="w-12 h-12 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              <span>Folder is empty</span>
              {currentFolder === 'Downloads' && (
                <span className="text-[11px] text-cyan-400/80">Transmitted files will arrive here</span>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
              {allFilesInFolder.map((file) => {
                const isSelected = selectedFile?.id === file.id;
                return (
                  <div
                    key={file.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, file)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(file);
                      // Clicking an image shows larger preview modal
                      if (file.type === 'image') {
                        handleOpenFile(file);
                      }
                    }}
                    onDoubleClick={() => handleOpenFile(file)}
                    onContextMenu={(e) => handleContextMenu(e, file)}
                    className={`flex flex-col items-center p-2.5 rounded-lg cursor-pointer transition-all border ${
                      isSelected
                        ? 'bg-cyan-950/60 border-cyan-400 text-white shadow-lg shadow-cyan-950/40'
                        : 'border-transparent hover:bg-slate-900/60 hover:border-slate-700/60 text-gray-300'
                    }`}
                  >
                    <div className="mb-2 relative">
                      {renderIcon(file)}
                      {file.isDropped && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-slate-950" />
                      )}
                      {file.isStego && (
                        <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-purple-500 rounded-full ring-2 ring-slate-950" title="Steganography asset" />
                      )}
                    </div>
                    <span className="text-xs text-center font-mono truncate w-full break-words">
                      {file.name}
                    </span>
                    <span className="text-[10px] text-gray-500 mt-0.5">{file.size}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            /* List View */
            <div className="w-full text-xs font-mono">
              <div className="grid grid-cols-12 pb-2 border-b border-gray-800 text-gray-500 font-semibold px-2">
                <span className="col-span-6">Name</span>
                <span className="col-span-2">Type</span>
                <span className="col-span-2">Size</span>
                <span className="col-span-2">Date</span>
              </div>
              {allFilesInFolder.map((file) => {
                const isSelected = selectedFile?.id === file.id;
                return (
                  <div
                    key={file.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, file)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(file);
                      if (file.type === 'image') {
                        handleOpenFile(file);
                      }
                    }}
                    onDoubleClick={() => handleOpenFile(file)}
                    onContextMenu={(e) => handleContextMenu(e, file)}
                    className={`grid grid-cols-12 items-center py-2 px-2 rounded cursor-pointer border-b border-gray-900/40 transition-colors ${
                      isSelected ? 'bg-cyan-950/60 text-white' : 'hover:bg-slate-900/50 text-gray-300'
                    }`}
                  >
                    <div className="col-span-6 flex items-center space-x-2.5 truncate">
                      <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center">
                        {file.imgSrc ? (
                          <img src={file.imgSrc} alt={file.name} className="w-5 h-5 object-contain rounded bg-[#0a0a0a] border border-cyan-500/30" />
                        ) : (
                          renderIcon(file)
                        )}
                      </div>
                      <span className="truncate">{file.name}</span>
                    </div>
                    <span className="col-span-2 text-gray-400 capitalize">{file.type}</span>
                    <span className="col-span-2 text-gray-400">{file.size}</span>
                    <span className="col-span-2 text-gray-500">{file.modified}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right Click Context Menu */}
      {contextMenu && (
        <div
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          className="absolute z-50 w-40 bg-slate-900 border border-cyan-500/40 rounded shadow-2xl py-1 text-xs font-mono text-gray-200"
        >
          {contextMenu.file ? (
            <>
              <button
                type="button"
                onClick={() => handleOpenFile(contextMenu.file)}
                className="w-full text-left px-3 py-1.5 hover:bg-cyan-900/50 hover:text-cyan-200 flex items-center space-x-2"
              >
                <span>{contextMenu.file.type === 'image' ? 'Preview' : 'Open'}</span>
              </button>
              <button
                type="button"
                onClick={() => handleCut(contextMenu.file)}
                className="w-full text-left px-3 py-1.5 hover:bg-cyan-900/50 hover:text-cyan-200 flex items-center space-x-2"
              >
                <span>Cut</span>
              </button>
              <button
                type="button"
                onClick={() => handleDelete(contextMenu.file)}
                className="w-full text-left px-3 py-1.5 text-red-400 hover:bg-red-950/50 flex items-center space-x-2"
              >
                <span>Delete</span>
              </button>
              <div className="border-t border-gray-800 my-1" />
              <button
                type="button"
                onClick={() => handleProperties(contextMenu.file)}
                className="w-full text-left px-3 py-1.5 hover:bg-cyan-900/50 hover:text-cyan-200 flex items-center space-x-2"
              >
                <span>Properties</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                disabled={!clipboardFile}
                onClick={handlePaste}
                className={`w-full text-left px-3 py-1.5 flex items-center space-x-2 ${
                  clipboardFile ? 'hover:bg-cyan-900/50 text-cyan-200' : 'text-gray-600 cursor-not-allowed'
                }`}
              >
                <span>Paste {clipboardFile ? `(${clipboardFile.name})` : ''}</span>
              </button>
              <div className="border-t border-gray-800 my-1" />
              <button
                type="button"
                onClick={() => {
                  setSelectedFile(null);
                  closeContextMenu();
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-cyan-900/50 text-gray-400"
              >
                <span>Refresh</span>
              </button>
            </>
          )}
        </div>
      )}

      {/* File Viewer / Properties Modal / Large Image Preview */}
      {modalInfo && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-cyan-500/60 rounded-xl shadow-2xl overflow-hidden flex flex-col animate-fade-in">
            <div className="bg-cyan-950/90 px-4 py-2.5 flex items-center justify-between border-b border-cyan-800/60">
              <span className="font-mono text-xs font-bold text-cyan-300 truncate">
                {modalInfo.file?.type === 'image' ? `Image Preview: ${modalInfo.title}` : modalInfo.title}
              </span>
              <button
                type="button"
                onClick={() => setModalInfo(null)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Larger view in simple modal for images */}
            {modalInfo.file?.type === 'image' && (
              <div className="p-4 bg-[#0a0a0a] flex flex-col items-center justify-center border-b border-cyan-900/40">
                <div className="w-56 h-56 bg-neutral-950 rounded-lg border border-cyan-500/30 flex items-center justify-center p-3 shadow-inner">
                  <img
                    src={modalInfo.file.imgSrc || (modalInfo.file.name?.includes('fragment_') ? `/stego/image${modalInfo.file.name.replace(/\D/g, '')}.svg` : `/stego/${modalInfo.file.name}`)}
                    alt={modalInfo.title}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
                <div className="text-[11px] text-cyan-300 font-mono mt-2">
                  {modalInfo.file.name} (Vector Steganographic Carrier)
                </div>
              </div>
            )}

            <div className="p-4 bg-black/50 text-xs font-mono text-gray-300 whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
              {modalInfo.content}
            </div>

            {/* Cracker Execution Area */}
            {modalInfo.isCracker && (
              <div className="p-3 bg-red-950/40 border-t border-red-900/60 flex flex-col gap-2">
                {payloadError && (
                  <div className="p-2 rounded bg-red-900/80 border border-red-500 text-red-200 text-xs font-mono">
                    {payloadError}
                  </div>
                )}
                {runningPayload ? (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px] font-mono text-cyan-300">
                      <span>{payloadStatus}</span>
                      <span>{payloadProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-900 rounded-full h-2 overflow-hidden border border-cyan-800">
                      <div
                        className="bg-gradient-to-r from-cyan-500 to-green-500 h-2 transition-all duration-300"
                        style={{ width: `${payloadProgress}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleExecuteCracker}
                    className="w-full py-2 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-mono font-bold text-xs uppercase tracking-wider rounded shadow-md transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>▶</span>
                    <span>RUN CRACKER (UNLOCK APPS)</span>
                  </button>
                )}
              </div>
            )}

            <div className="p-3 bg-slate-950 border-t border-gray-800 flex justify-between items-center">
              <span className="text-[10px] text-gray-500">File Explorer Viewer</span>
              <button
                type="button"
                onClick={() => setModalInfo(null)}
                className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-black font-semibold text-xs rounded transition-colors cursor-pointer"
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
