import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Settings, FileText, Download, LayoutDashboard, Timer, Clock, ArrowLeft, PenTool, MessageSquare, HelpCircle, Layers } from 'lucide-react';
import {
  AppConfig, LineId, LogEntry, ActiveSessionsMap, UndoInfo, PromptState
} from './types';
import { DEFAULT_CONFIG, LINES, LINE_COLORS } from './constants';
import { uuid, formatDuration } from './utils';
import Wheel from './components/Wheel';
import { PromptModal, LogModal, LineSettingsModal, GlobalSettingsModal, MemoModal, HelpModal, TemplateModal } from './components/Modals';

const STORAGE_KEY_CONFIG = 'wheel_config_v2';
const STORAGE_KEY_LOGS_PREFIX = 'timelogs_v2_';

function App() {
  // --- State ---
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [currentLine, setCurrentLine] = useState<LineId>('A');
  const [activeSessions, setActiveSessions] = useState<ActiveSessionsMap>({
    A: null, B: null, C: null, D: null, E: null
  });
  const [lastEnded, setLastEnded] = useState<Record<LineId, { task: string; endedAt: number } | null>>({
    A: null, B: null, C: null, D: null, E: null
  });

  // UI State
  const [now, setNow] = useState(Date.now());
  const [undoInfo, setUndoInfo] = useState<UndoInfo | null>(null);

  // Mode State
  const [isEditMode, setIsEditMode] = useState(false);

  // Modals
  const [promptState, setPromptState] = useState<PromptState>({ isOpen: false, message: '', onConfirm: () => { }, onCancel: () => { } });
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [editingLine, setEditingLine] = useState<LineId | null>(null); // For Line Settings
  const [isGlobalSettingsOpen, setIsGlobalSettingsOpen] = useState(false); // For Global Settings
  const [isMemoOpen, setIsMemoOpen] = useState(false); // For Memo Modal
  const [currentMemo, setCurrentMemo] = useState(''); // Current memo text
  const [isHelpOpen, setIsHelpOpen] = useState(false); // For Help Modal
  const [isTemplateOpen, setIsTemplateOpen] = useState(false); // For Template Modal

  // Refs
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastInteractionRef = useRef<number>(Date.now());
  const maxSessionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idlePromptShownRef = useRef(false);

  // --- Initialization & Effects ---
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
      if (saved) setConfig({ ...DEFAULT_CONFIG, ...JSON.parse(saved) });
    } catch (e) { console.error('Failed to load config', e); }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
  }, [config]);

  // --- Logic: Logging ---
  const getLogs = (line: LineId): LogEntry[] => {
    try {
      return JSON.parse(localStorage.getItem(`${STORAGE_KEY_LOGS_PREFIX}${line}`) || '[]');
    } catch { return []; }
  };

  const getAllLogs = (): LogEntry[] => {
    return LINES.flatMap(line => getLogs(line));
  };

  const saveLog = (line: LineId, log: LogEntry) => {
    const logs = getLogs(line);
    logs.push(log);
    localStorage.setItem(`${STORAGE_KEY_LOGS_PREFIX}${line}`, JSON.stringify(logs));
    setLastEnded(prev => ({ ...prev, [line]: { task: log.task, endedAt: log.endedAt } }));
  };

  const removeLog = (line: LineId, logId: string) => {
    const logs = getLogs(line);
    const newLogs = logs.filter(l => l.id !== logId);
    localStorage.setItem(`${STORAGE_KEY_LOGS_PREFIX}${line}`, JSON.stringify(newLogs));
  };

  // --- Logic: Interaction Tracking ---
  const touch = useCallback(() => {
    lastInteractionRef.current = Date.now();
  }, []);

  useEffect(() => {
    const events = ['click', 'mousemove', 'keydown', 'touchstart', 'touchmove'];
    events.forEach(ev => window.addEventListener(ev, touch as any, { passive: true }));
    return () => events.forEach(ev => window.removeEventListener(ev, touch as any));
  }, [touch]);
  // Track which break alerts have been shown today
  const breakAlertsShownRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const checkBreakTime = setInterval(() => {
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const today = now.toDateString();

      // Reset shown alerts if it's a new day
      if (breakAlertsShownRef.current.size > 0) {
        const firstKey = Array.from(breakAlertsShownRef.current)[0] as string;
        if (firstKey && !firstKey.startsWith(today)) {
          breakAlertsShownRef.current.clear();
        }
      }

      const breakAlerts = config.breakAlerts || ['10:00', '11:45', '15:00'];

      for (const breakTime of breakAlerts) {
        const alertKey = `${today}_${breakTime}`;
        if (currentTime === breakTime && !breakAlertsShownRef.current.has(alertKey) && !promptState.isOpen) {
          breakAlertsShownRef.current.add(alertKey);
          setPromptState({
            isOpen: true,
            message: `${breakTime} です。休憩時間になりました。休憩にしますか？`,
            onConfirm: () => {
              if (activeSessions[currentLine]) {
                stopTracking(currentLine, '定時休憩');
              }
              startTracking(currentLine, '休憩');
              setPromptState(prev => ({ ...prev, isOpen: false }));
            },
            onCancel: () => {
              setPromptState(prev => ({ ...prev, isOpen: false }));
            }
          });
          break;
        }
      }
    }, 30000); // Check every 30 seconds
    return () => clearInterval(checkBreakTime);
  }, [config.breakAlerts, activeSessions, currentLine, promptState.isOpen]);

  // --- Logic: Tracking Control ---
  const resetMaxTimer = useCallback((line: LineId) => {
    if (maxSessionTimerRef.current) clearTimeout(maxSessionTimerRef.current);
    if (line !== currentLine) return;

    if (config.maxSessionMin > 0) {
      maxSessionTimerRef.current = setTimeout(() => {
        if (config.maxSessionAction === 'stop') {
          stopTracking(line, '上限時間により自動終了');
        } else {
          setPromptState({
            isOpen: true,
            message: '計測が上限時間に達しました。終了しますか？',
            onConfirm: () => {
              stopTracking(line, '上限時間により終了');
              setPromptState(prev => ({ ...prev, isOpen: false }));
            },
            onCancel: () => setPromptState(prev => ({ ...prev, isOpen: false }))
          });
        }
      }, config.maxSessionMin * 60000);
    }
  }, [config.maxSessionMin, config.maxSessionAction, currentLine]);

  const startTracking = (line: LineId, task: string) => {
    touch();
    const active = activeSessions[line];
    if (active) {
      const log: LogEntry = {
        id: uuid(),
        line,
        lineName: config.lines[line].name,
        task: active.task,
        startedAt: active.startedAt,
        endedAt: Date.now(),
        memo: active.memo
      };
      saveLog(line, log);
      showUndo({ type: 'autostop', line, log });
    }
    setActiveSessions(prev => ({ ...prev, [line]: { task, startedAt: Date.now(), memo: '' } }));
    setCurrentMemo('');
    resetMaxTimer(line);
  };

  const stopTracking = (line: LineId, reason?: string) => {
    touch();
    const active = activeSessions[line];
    if (!active) return;
    const log: LogEntry = {
      id: uuid(),
      line,
      lineName: config.lines[line].name,
      task: active.task,
      startedAt: active.startedAt,
      endedAt: Date.now(),
      reason,
      memo: active.memo || currentMemo
    };
    setCurrentMemo('');
    saveLog(line, log);
    setActiveSessions(prev => ({ ...prev, [line]: null }));
    showUndo({ type: 'stop', line, log });
    if (maxSessionTimerRef.current) clearTimeout(maxSessionTimerRef.current);
  };

  const showUndo = (info: UndoInfo) => {
    setUndoInfo(info);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    undoTimerRef.current = setTimeout(() => setUndoInfo(null), 3000);
  };

  const handleUndo = () => {
    if (!undoInfo) return;
    const { line, log } = undoInfo;
    removeLog(line, log.id);
    setActiveSessions(prev => ({ ...prev, [line]: { task: log.task, startedAt: log.startedAt } }));
    setUndoInfo(null);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    resetMaxTimer(line);
  };

  const handleCsvExport = () => {
    const all = getAllLogs().sort((a, b) => a.startedAt - b.startedAt);
    const header = ['ラインID', 'ライン名', 'タスク', '開始日時', '終了日時', '所要時間(秒)', '理由', 'メモ'];
    const rows = all.map(l => {
      const dur = Math.round((l.endedAt - l.startedAt) / 1000);
      const escape = (s: string) => `"${String(s || '').replace(/"/g, '""')}"`;
      const formatDate = (ts: number) => new Date(ts).toLocaleString('ja-JP');
      return [l.line, escape(l.lineName), escape(l.task), escape(formatDate(l.startedAt)), escape(formatDate(l.endedAt)), dur, escape(l.reason), escape(l.memo)].join(',');
    });
    const blob = new Blob([[header.join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `timelogs_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  // --- Logic: Click Handling ---
  const handleWheelTaskClick = (task: string) => {
    if (isEditMode) return; // Ignore in edit mode
    startTracking(currentLine, task);
  };

  const handleWheelLineClick = (line: LineId) => {
    if (isEditMode) {
      setEditingLine(line); // Open Line Editor
    } else {
      setCurrentLine(line); // Switch Line
    }
  };

  const handleWheelLineDoubleClick = (line: LineId) => {
    if (isEditMode) return;
    // Double click triggers "立ち下げ" (shutdown)
    startTracking(line, '立ち下げ');
  };

  const handleCenterClick = () => {
    touch();
    if (isEditMode) {
      setIsEditMode(false); // Exit Edit Mode
      return;
    }
    if (activeSessions[currentLine]) {
      stopTracking(currentLine);
      return;
    }
    // Idle Action logic
    const action = config.centerIdleAction;
    if (action === 'resume') {
      const last = lastEnded[currentLine];
      if (last && (Date.now() - last.endedAt) <= (config.quickResumeMin || 10) * 60000) {
        startTracking(currentLine, last.task);
      }
    } else if (action === 'startDefault') {
      const def = config.lines[currentLine].categories[0];
      if (def) startTracking(currentLine, def);
    }
  };

  const handleDashboardClick = () => {
    if (isEditMode) {
      setIsGlobalSettingsOpen(true); // Open Global Settings
    }
  };

  // --- Keyboard ---
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (!isEditMode && activeSessions[currentLine]) stopTracking(currentLine);
      }
      if (!isEditMode && e.key >= '1' && e.key <= '5') {
        const map: LineId[] = ['A', 'B', 'C', 'D', 'E'];
        const idx = parseInt(e.key) - 1;
        if (map[idx]) setCurrentLine(map[idx]);
      }
      if (e.code === 'Escape') {
        setIsLogOpen(false);
        setEditingLine(null);
        setIsGlobalSettingsOpen(false);
        if (isEditMode) setIsEditMode(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [currentLine, activeSessions, isEditMode]);

  const lineConf = config.lines[currentLine];
  const currentSession = activeSessions[currentLine];
  const currentColor = LINE_COLORS[currentLine];

  return (
    <div className={`min-h-screen w-full relative overflow-hidden bg-slate-950 text-slate-100 font-sans selection:bg-blue-500/30 ${isEditMode ? 'ring-8 ring-inset ring-blue-500/20' : ''}`}>

      {/* Background Decor */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] rounded-full opacity-5 blur-[120px] pointer-events-none transition-colors duration-1000"
        style={{ backgroundColor: currentColor }}
      />

      {/* --- CONCENTRIC HUD (Stuck to Wheel) --- */}
      {/* 
          We place this BEHIND the wheel or on top with pointer-events-none?
          On top for text visibility, but ensure clicking passes through empty areas. 
          Actually, the text should be on a layer that doesn't block wheel clicks.
          The wheel is z-20. Let's put this at z-20 as well or z-10?
          If z-20, we need to make sure the container is pointer-events-none.
      */}
      <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
        <svg viewBox="0 0 1000 1000" className="w-full h-full max-w-[1000px] max-h-[1000px] animate-in fade-in duration-1000">
          <defs>
            {/* Define paths for text. 
                     Wheel is roughly 600-700px in this huge viewport?
                     Let's estimate radii based on Wheel.tsx constants scaled up.
                     Outer Radius of Wheel is 320. Let's put text at R=360.
                     Center (500, 500).
                 */}
            {/* Top Arc for Line Name (Clockwise? No, readable usually means left-to-right on top) */}
            <path id="topCurve" d="M 300,500 A 200,200 0 0,1 700,500" fill="none" /> {/* Simple arc for inspection */}
            {/* Better Top Curve: From 10 o'clock to 2 o'clock */}
            <path id="hudTopPath" d="M 340,400 A 220,220 0 0,1 660,400" fill="none" /> {/* Approx */}

            {/* Actually let's use exact math relative to 500,500 */}
            {/* R = 370 (Just outside the expanded wheel R=320 + gap) */}
            {/* Top: -45 deg to +45 deg (Up is -90). So -135 to -45?
                     Let's use standard angles.
                     Top centered at -90deg.
                     We want text from approx -130deg to -50deg.
                 */}
            <path id="textPathTop" d="M 300,500 A 200,200 0 0,1 700,500" transform="translate(0, -20)" /> {/* Placeholder, will refine below */}
          </defs>

          {/* 
                 Radius Calibration:
                 Wheel Inner: 80
                 Wheel Outer: 240
                 Line Outer: 300
                 Expanded Line Outer: 320
                 Border Padding: 5-10
                 
                 So HUD should be at R=360+.
                 
                 Center: 500, 500.
             */}

          {/* TOP: LINE NAME */}
          {/* Path from Left-Top to Right-Top.
                 Start Angle: -140 degrees. End Angle: -40 degrees.
                 x = 500 + r * cos(theta)
                 y = 500 + r * sin(theta)
             */}
          <path id="pathLineName" d="M 217,217 A 400,400 0 0,1 783,217" fill="none" /> {/* R=400 approx */}
          <path id="pathLineNamePrecise"
            d="M 244,350 A 360,360 0 0,1 756,350"
            fill="none" /> {/* R=360, Angle ~200 to ~340? No. */}

          {/* Let's Try: R=360. 
                 Start Angle -120deg (240 deg): x=500+360*(-0.5)=320, y=500+360*(-0.866)=188
                 End Angle -60deg (300 deg): x=500+360*(0.5)=680, y=188
             */}
          <path id="curveTop" d="M 320,188 A 360,360 0 0,1 680,188" fill="none" />

          <text className="fill-slate-500 font-bold tracking-[0.2em] text-sm uppercase" dy="-10">
            <textPath href="#curveTop" startOffset="50%" textAnchor="middle">
              Current Line
            </textPath>
          </text>
          <text className="fill-white font-black tracking-tight text-4xl" dy="25">
            <textPath href="#curveTop" startOffset="50%" textAnchor="middle">
              {config.lines[currentLine].name}
            </textPath>
          </text>


          {/* RIGHT: TIME */}
          {/* R=360. Angle -30 to +30? 
                 Angle -30 (330): x=811, y=320
                 Angle +30 (30): x=811, y=680
             */}
          <path id="curveRight" d="M 811,320 A 360,360 0 0,1 811,680" fill="none" />
          <text className="fill-white font-mono font-bold tracking-tighter text-5xl" dy="10">
            <textPath href="#curveRight" startOffset="50%" textAnchor="middle">
              {currentSession ? formatDuration(now - currentSession.startedAt) : "00:00:00"}
            </textPath>
          </text>
          {currentSession && (
            <text className="fill-emerald-400 font-bold tracking-widest text-xs uppercase" dy="-25">
              <textPath href="#curveRight" startOffset="50%" textAnchor="middle">
                ● Recording
              </textPath>
            </text>
          )}


          {/* BOTTOM: ACTIVITY */}
          {/* R=360. Angle 120 to 60? No we want bottom.
                 Angle 120 to 60 is top.
                 We want Angle 120 (bottom right) to 240 (bottom left)? No.
                 Angle 60 (300?) -> No.
                 Standard Unit Circle: 0=Right, 90=Down. 
                 Bottom is 90.
                 We want 60 to 120.
                 Angle 60: x=680, y=811
                 Angle 120: x=320, y=811
                 Direction: usually we want text to be upright?
                 For bottom text, we draw the path from Right to Left!
                 Start (680, 811) -> End (320, 811).
             */}
          <path id="curveBottom" d="M 720,780 A 360,360 0 0,0 280,780" fill="none" />
          {/* Using sweep-flag 0 to curve 'inward' relative to center? Or outward? 
                 M x1 y1 A rx ry rot large-arc sweep x2 y2
                 Tested mentally: 680,811 to 320,811 with R=360.
             */}

          <text className="fill-slate-500 font-bold tracking-widest text-xs uppercase" dy="-5">
            <textPath href="#curveBottom" startOffset="50%" textAnchor="middle">
              Current Activity
            </textPath>
          </text>
          <text className={`font-black tracking-tight text-3xl ${currentSession ? "fill-white" : "fill-slate-600"}`} dy="25">
            <textPath href="#curveBottom" startOffset="50%" textAnchor="middle">
              {currentSession ? currentSession.task : "IDLE"}
            </textPath>
          </text>

        </svg>
      </div>

      {/* Corner Controls (Minimal) */}
      <div className="absolute bottom-6 left-6 z-40 flex gap-2">
        <button onClick={() => setIsEditMode(!isEditMode)} className={`p-4 rounded-full backdrop-blur-md border shadow-lg transition-transform hover:scale-110 ${isEditMode ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-white'}`}>
          <Settings className={isEditMode ? "animate-spin" : ""} size={24} />
        </button>
        {isEditMode && (
          <button onClick={() => setIsGlobalSettingsOpen(true)} className="p-4 rounded-full bg-slate-900/50 backdrop-blur-md border border-slate-800 text-slate-400 hover:text-white hover:scale-110 shadow-lg"><LayoutDashboard size={24} /></button>
        )}
      </div>

      <div className="absolute bottom-6 right-6 z-40 flex gap-2">
        <button onClick={() => setIsLogOpen(true)} className="p-4 rounded-full bg-slate-900/50 backdrop-blur-md border border-slate-800 text-slate-400 hover:text-white hover:scale-110 shadow-lg"><FileText size={24} /></button>
        {currentSession && (
          <button onClick={() => setIsMemoOpen(true)} className="p-4 rounded-full bg-emerald-900/40 backdrop-blur-md border border-emerald-500/50 text-emerald-400 hover:text-emerald-300 hover:scale-110 shadow-lg"><MessageSquare size={24} /></button>
        )}
      </div>

      {/* Main Wheel (Centered) */}
      <main className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
        {isEditMode && <div className="absolute top-32 text-blue-400 text-xs font-bold animate-bounce uppercase tracking-widest z-40 bg-slate-950/80 px-4 py-1 rounded-full border border-blue-500/30">Edit Mode Active</div>}
        <div className="transform scale-90 sm:scale-100 xl:scale-110 transition-transform duration-500 pointer-events-auto">
          <Wheel
            currentLine={currentLine}
            categories={lineConf.categories}
            lineNames={Object.fromEntries(LINES.map(l => [l, config.lines[l].name])) as any}
            isTracking={!!currentSession}
            currentTask={currentSession?.task || ''}
            activeSessions={activeSessions}
            isEditMode={isEditMode}
            onTaskClick={handleWheelTaskClick}
            onLineClick={handleWheelLineClick}
            onLineDoubleClick={handleWheelLineDoubleClick}
            onCenterClick={handleCenterClick}
          />
        </div>
      </main>

      {/* Undo Snackbar */}
      {undoInfo && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 bg-slate-800 border border-slate-700 text-white pl-5 pr-3 py-3 rounded-full shadow-2xl flex items-center gap-6 z-[1200] animate-in slide-in-from-top-5 fade-in duration-300">
          <span className="text-sm font-medium tracking-wide">{undoInfo.type === 'stop' ? 'Task Stopped' : 'Auto Switched'}</span>
          <button onClick={handleUndo} className="bg-slate-100 text-slate-900 px-4 py-1.5 rounded-full text-xs font-bold hover:bg-white transition-colors">UNDO</button>
        </div>
      )}

      {/* Modals */}
      <PromptModal
        isOpen={promptState.isOpen}
        message={promptState.message}
        onConfirm={promptState.onConfirm}
        onCancel={promptState.onCancel}
      />
      <LogModal
        isOpen={isLogOpen}
        onClose={() => setIsLogOpen(false)}
        logs={getAllLogs()}
      />

      {/* Settings Modals */}
      {editingLine && (
        <LineSettingsModal
          isOpen={true}
          onClose={() => setEditingLine(null)}
          lineId={editingLine}
          config={config}
          onSave={(lineId, newName, newCats) => {
            setConfig(prev => ({
              ...prev,
              lines: { ...prev.lines, [lineId]: { name: newName, categories: newCats } }
            }));
            setEditingLine(null);
          }}
        />
      )}
      <GlobalSettingsModal
        isOpen={isGlobalSettingsOpen}
        onClose={() => setIsGlobalSettingsOpen(false)}
        config={config}
        onSave={(newConf) => { setConfig(newConf); setIsGlobalSettingsOpen(false); }}
        onReset={() => { setConfig(DEFAULT_CONFIG); setIsGlobalSettingsOpen(false); }}
      />
      <MemoModal
        isOpen={isMemoOpen}
        onClose={() => setIsMemoOpen(false)}
        memo={currentMemo}
        onSave={(memo) => {
          setCurrentMemo(memo);
          // Update active session with memo
          if (activeSessions[currentLine]) {
            setActiveSessions(prev => ({
              ...prev,
              [currentLine]: { ...prev[currentLine]!, memo }
            }));
          }
        }}
      />
      <HelpModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />
      <TemplateModal
        isOpen={isTemplateOpen}
        onClose={() => setIsTemplateOpen(false)}
        currentConfig={config}
        onApplyTemplate={(newConfig) => setConfig(newConfig)}
      />
    </div>
  );
}

export default App;