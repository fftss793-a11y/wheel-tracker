import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Play, Square, RotateCcw, Save, Search, X,
  LayoutDashboard, HelpCircle, FileText, Settings,
  PenTool, Download, Upload, Plus, Trash2, Edit2, Layers
} from 'lucide-react';
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

  const startTracking = (line: LineId, task: string, initialMemo: string = '') => {
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
    setActiveSessions(prev => ({ ...prev, [line]: { task, startedAt: Date.now(), memo: initialMemo } }));
    setCurrentMemo(initialMemo);
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
      {/* --- HUD: MODERN CLEAN (Four Corners) --- */}

      {/* TL: Clock & Date */}
      <div className="absolute top-6 left-8 z-30 pointer-events-none select-none">
        <div className="text-5xl font-bold tracking-tighter text-white drop-shadow-lg font-mono">
          {new Date(now).toLocaleTimeString('en-US', { hour12: false })}
          <span className="text-xl text-slate-500 ml-2 align-baseline font-sans tracking-normal">{new Date(now).getMilliseconds().toString().padStart(3, '0').slice(0, 2)}</span>
        </div>
        <div className="text-sm text-slate-500 font-bold tracking-[0.2em] uppercase mt-1">
          {new Date(now).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' })}
        </div>
      </div>

      {/* TR: System Controls */}
      <div className="absolute top-6 right-8 z-40 flex flex-col gap-3 items-end">
        <div className="flex gap-2">
          <button onClick={() => setIsLogOpen(true)} className="p-3 rounded-lg bg-slate-900/80 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-all shadow-lg" title="ログ"><FileText size={20} /></button>
          <button onClick={() => setIsEditMode(!isEditMode)} className={`p-3 rounded-lg border transition-all shadow-lg ${isEditMode ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-900/80 border-slate-700 text-slate-400 hover:text-white hover:border-slate-500'}`} title="設定"><Settings className={isEditMode ? "animate-spin" : ""} size={20} /></button>
        </div>
        {isEditMode && (
          <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-2">
            <button onClick={() => setIsGlobalSettingsOpen(true)} className="p-3 rounded-lg bg-slate-900/80 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-all shadow-lg" title="全体設定"><LayoutDashboard size={20} /></button>
            <button onClick={() => setIsHelpOpen(true)} className="p-3 rounded-lg bg-slate-900/80 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-all shadow-lg" title="ヘルプ"><HelpCircle size={20} /></button>
          </div>
        )}
      </div>

      {/* BL: Line Status */}
      <div className="fixed bottom-12 left-8 z-30 pointer-events-none select-none">
        <div className="flex items-center gap-3 mb-2">
          <div className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700 uppercase tracking-widest">
            Selected Line
          </div>
          {isEditMode && <span className="text-xs text-blue-400 font-bold animate-pulse">Running Setup...</span>}
        </div>
        <div className="text-5xl font-black tracking-tight text-white drop-shadow-xl">
          {config.lines[currentLine].name}
        </div>
        <div className="mt-2 flex flex-col items-start gap-1">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Current Task</div>
          <div className="flex items-center gap-3">
            <div className={`text-xl font-bold tracking-wide ${currentSession ? 'text-white' : 'text-slate-600'}`}>
              {currentSession ? currentSession.task : 'IDLE...'}
            </div>
            {currentSession && (
              <button
                onClick={() => setIsMemoOpen(true)}
                className="pointer-events-auto p-2 rounded-full bg-slate-800 text-slate-400 border border-slate-700 hover:text-white hover:bg-slate-700 hover:border-slate-500 transition-all shadow-lg active:scale-95 flex-shrink-0"
                title="Save Memo"
              >
                <PenTool size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* BR: Main Timer */}
      <div className="fixed bottom-12 right-8 z-30 pointer-events-none select-none text-right">
        <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">Elapsed Duration</div>
        <div className={`text-6xl sm:text-7xl font-mono font-bold tracking-tighter drop-shadow-2xl tabular-nums ${currentSession ? 'text-white' : 'text-slate-700'}`}>
          {currentSession ? formatDuration(now - currentSession.startedAt) : "00:00:00"}
        </div>
      </div>

      {/* Corner Controls (Minimal) */}
      {/* Wheel Container - Centered */}
      <div
        className="relative z-10 flex items-center justify-center min-h-screen"
        style={{
          transform: `scale(${config.uiScale || 1.0})`,
          transformOrigin: 'center center',
          transition: 'transform 0.3s ease-out'
        }}
      >
        {/* Background Ring (Faint) */}
        {isEditMode && <div className="absolute top-32 text-blue-400 text-xs font-bold animate-bounce uppercase tracking-widest z-40 bg-slate-950/80 px-4 py-1 rounded-full border border-blue-500/30">Edit Mode Active</div>}
        <div
          className="transition-transform duration-500 pointer-events-auto scale-[0.8] sm:scale-90 xl:scale-100 -translate-y-12"
        >
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
            hudData={{
              lineName: config.lines[currentLine].name,
              timeString: currentSession ? formatDuration(now - currentSession.startedAt) : "00:00:00",
              activityString: currentSession ? currentSession.task : "SYSTEM IDLE",
              isRecording: !!currentSession
            }}
          />
        </div>
      </div>

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
        onReset={() => {
          if (!confirm('設定を初期化しますか？')) return;
          localStorage.removeItem(STORAGE_KEY_CONFIG);
          window.location.reload();
        }}
        onDeleteLogs={() => {
          if (!confirm('すべてのログを削除しますか？この操作は取り消せません。')) return;
          LINES.forEach(line => localStorage.removeItem(`${STORAGE_KEY_LOGS_PREFIX}${line}`));
          window.location.reload();
        }}
      />
      <MemoModal
        isOpen={isMemoOpen}
        onClose={() => setIsMemoOpen(false)}
        memo={currentMemo}
        onSave={(memo) => {
          // If memo changes, split the log: Stop current -> Start new with new memo
          if (activeSessions[currentLine]) {
            startTracking(currentLine, activeSessions[currentLine]!.task, memo);
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