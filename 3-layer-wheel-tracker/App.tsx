import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Play, Square, RotateCcw, Save, Search, X,
  LayoutDashboard, HelpCircle, FileText, Settings,
  PenTool, Download, Upload, Plus, Trash2, Edit2, Layers, LogOut
} from 'lucide-react';
import {
  AppConfig, LineId, LogEntry, ActiveSessionsMap, UndoInfo, PromptState, UIElementId, UIPosition
} from './types';
import { DEFAULT_CONFIG, LINES, LINE_COLORS } from './constants';
import { uuid, formatDuration } from './utils';
import Wheel from './components/Wheel';
import Draggable from './components/Draggable';
import { PromptModal, LogModal, LineSettingsModal, GlobalSettingsModal, MemoModal, HelpModal, TemplateModal } from './components/Modals';

const STORAGE_KEY_CONFIG = 'wheel_config_factory_v6';
const STORAGE_KEY_LOGS_PREFIX = 'timelogs_v2_';

function App() {
  // --- State ---
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [currentLine, setCurrentLine] = useState<LineId>('A');
  const [activeSessions, setActiveSessions] = useState<ActiveSessionsMap>({
    A: null, B: null, C: null, D: null, E: null, F: null
  });
  const [lastEnded, setLastEnded] = useState<Record<LineId, { task: string; endedAt: number } | null>>({
    A: null, B: null, C: null, D: null, E: null, F: null
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

  const updateLogMemo = (logId: string, line: LineId, newMemo: string) => {
    const logs = getLogs(line);
    const updatedLogs = logs.map(l => l.id === logId ? { ...l, memo: newMemo } : l);
    localStorage.setItem(`${STORAGE_KEY_LOGS_PREFIX}${line}`, JSON.stringify(updatedLogs));
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

  // --- Logic: Tracking Control ---

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
    setActiveSessions(prev => ({ ...prev, [line]: { task: log.task, startedAt: log.startedAt, memo: log.memo } }));
    setCurrentMemo(log.memo || '');
    setUndoInfo(null);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
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
      // Sync currentMemo with the selected line's session memo
      const session = activeSessions[line];
      setCurrentMemo(session?.memo || '');
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

  // --- End of Day Handler ---
  const handleEndOfDay = () => {
    setPromptState({
      isOpen: true,
      message: '本日の業務を終了しますか？\n\n• 実行中のタスクを停止\n• ログをCSVエクスポート\n• ログデータをクリア',
      onConfirm: () => {
        // 1. Stop all active sessions
        LINES.forEach(line => {
          if (activeSessions[line]) {
            const active = activeSessions[line]!;
            const log: LogEntry = {
              id: uuid(),
              line,
              lineName: config.lines[line].name,
              task: active.task,
              startedAt: active.startedAt,
              endedAt: Date.now(),
              reason: '終業',
              memo: active.memo
            };
            const logs = getLogs(line);
            logs.push(log);
            localStorage.setItem(`${STORAGE_KEY_LOGS_PREFIX}${line}`, JSON.stringify(logs));
          }
        });
        setActiveSessions({ A: null, B: null, C: null, D: null, E: null, F: null });

        // 2. Export all logs to CSV
        const allLogs = LINES.flatMap(line => {
          try { return JSON.parse(localStorage.getItem(`${STORAGE_KEY_LOGS_PREFIX}${line}`) || '[]'); } catch { return []; }
        }).sort((a: LogEntry, b: LogEntry) => a.startedAt - b.startedAt);

        if (allLogs.length > 0) {
          const header = ['ラインID', 'ライン名', 'タスク', '開始日時', '終了日時', '所要時間(秒)', 'メモ'];
          const rows = allLogs.map((l: LogEntry) => {
            const dur = Math.round((l.endedAt - l.startedAt) / 1000);
            const esc = (s: string | undefined) => `"${String(s || '').replace(/"/g, '""')}"`;
            const formatDate = (ts: number) => new Date(ts).toLocaleString('ja-JP');
            return [l.line, esc(l.lineName), esc(l.task), esc(formatDate(l.startedAt)), esc(formatDate(l.endedAt)), dur, esc(l.memo)].join(',');
          });
          const blob = new Blob([[header.join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = `timelogs_${new Date().toISOString().slice(0, 10)}.csv`;
          document.body.appendChild(a); a.click(); document.body.removeChild(a);
        }

        // 3. Clear logs from localStorage
        LINES.forEach(line => localStorage.removeItem(`${STORAGE_KEY_LOGS_PREFIX}${line}`));

        setPromptState(prev => ({ ...prev, isOpen: false }));
      },
      onCancel: () => setPromptState(prev => ({ ...prev, isOpen: false }))
    });
  };

  // --- Keyboard ---
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (!isEditMode && activeSessions[currentLine]) stopTracking(currentLine);
      }
      if (!isEditMode && e.key >= '1' && e.key <= '6') {
        const map: LineId[] = ['A', 'B', 'C', 'D', 'E', 'F'];
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
  const isLightTheme = config.theme === 'light';

  // Default UI positions
  const defaultUIPositions: Record<UIElementId, UIPosition> = {
    clock: { x: 32, y: 24, anchor: 'top-left' },
    controls: { x: 32, y: 24, anchor: 'top-right' },
    lineStatus: { x: 32, y: 48, anchor: 'bottom-left' },
    timer: { x: 32, y: 48, anchor: 'bottom-right' }
  };

  // Get current UI positions (merge with defaults)
  const getUIPosition = (id: UIElementId): UIPosition => {
    return config.uiPositions?.[id] || defaultUIPositions[id];
  };

  // Handle UI position changes
  const handleUIPositionChange = (id: string, position: UIPosition) => {
    setConfig(prev => ({
      ...prev,
      uiPositions: {
        ...prev.uiPositions,
        [id]: position
      }
    }));
  };

  return (
    <div className={`min-h-screen w-full relative overflow-hidden font-sans selection:bg-blue-500/30 transition-colors duration-500 ${isLightTheme ? 'bg-slate-100 text-slate-900' : 'bg-slate-950 text-slate-100'} ${isEditMode ? 'ring-8 ring-inset ring-blue-500/20' : ''}`}>

      {/* Background Decor */}
      <div
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] rounded-full blur-[120px] pointer-events-none transition-colors duration-1000 ${isLightTheme ? 'opacity-10' : 'opacity-5'}`}
        style={{ backgroundColor: currentColor }}
      />

      {/* --- HUD: MODERN CLEAN (Four Corners) --- */}

      {/* TL: Clock & Date */}
      <Draggable
        id="clock"
        initialPosition={getUIPosition('clock')}
        isEnabled={isEditMode}
        onPositionChange={handleUIPositionChange}
        className="z-30"
        bounds={{ left: 0, top: 0, right: 0, bottom: 0 }}
      >
        <div className={`select-none ${isEditMode ? '' : 'pointer-events-none'}`}>
          <div className={`text-6xl font-bold tracking-tighter drop-shadow-lg font-mono ${isLightTheme ? 'text-slate-900' : 'text-white'}`}>
            {new Date(now).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
          </div>
          <div className="text-xl text-slate-400 font-bold tracking-[0.1em] mt-1 ml-1">
            {new Date(now).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' })}
          </div>
        </div>
      </Draggable>

      {/* TR: System Controls */}
      <Draggable
        id="controls"
        initialPosition={getUIPosition('controls')}
        isEnabled={isEditMode}
        onPositionChange={handleUIPositionChange}
        className="z-40"
        bounds={{ left: 0, top: 0, right: 0, bottom: 0 }}
      >
        <div className="flex flex-col gap-3 items-end pointer-events-auto">
          <div className="flex gap-2">
            <button onClick={() => setIsEditMode(!isEditMode)} className={`p-4 rounded-lg border transition-all shadow-lg ${isEditMode ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-900/80 border-slate-700 text-slate-400 hover:text-white hover:border-slate-500'}`} title="設定"><Settings className={isEditMode ? "animate-spin" : ""} size={24} /></button>
          </div>
          {isEditMode && (
            <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-2">
              <button onClick={handleEndOfDay} className="p-3 rounded-lg bg-orange-600/80 border border-orange-500 text-white hover:bg-orange-500 transition-all shadow-lg" title="終業">
                <LogOut size={20} />
              </button>
              <button onClick={() => setIsTemplateOpen(true)} className="p-3 rounded-lg bg-slate-900/80 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-all shadow-lg" title="テンプレート">
                <Layers size={20} />
              </button>
              <button onClick={() => setIsLogOpen(true)} className="p-3 rounded-lg bg-slate-900/80 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-all shadow-lg" title="ログ"><FileText size={20} /></button>
              <button onClick={() => setIsGlobalSettingsOpen(true)} className="p-3 rounded-lg bg-slate-900/80 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-all shadow-lg" title="全体設定"><LayoutDashboard size={20} /></button>
              <button onClick={() => setIsHelpOpen(true)} className="p-3 rounded-lg bg-slate-900/80 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-all shadow-lg" title="ヘルプ"><HelpCircle size={20} /></button>
            </div>
          )}
        </div>
      </Draggable>

      {/* BL: Line Status */}
      <Draggable
        id="lineStatus"
        initialPosition={getUIPosition('lineStatus')}
        isEnabled={isEditMode}
        onPositionChange={handleUIPositionChange}
        className="z-30"
        bounds={{ left: 0, top: 0, right: 0, bottom: 0 }}
      >
        <div className={`select-none ${isEditMode ? '' : 'pointer-events-none'}`}>
          <div className="flex items-center gap-3 mb-2">
            <div className="px-3 py-1 rounded text-[12px] font-bold bg-slate-800 text-slate-300 border border-slate-700 tracking-widest">
              ライン選択
            </div>
            {isEditMode && <span className="text-xs text-blue-400 font-bold animate-pulse">設定モード中...</span>}
          </div>
          <div className={`text-6xl font-black tracking-tight drop-shadow-xl ${isLightTheme ? 'text-slate-900' : 'text-white'}`}>
            {config.lines[currentLine].name}
          </div>
          <div className="mt-4 flex flex-col items-start gap-1">
            <div className="text-[12px] uppercase tracking-widest text-slate-400 font-bold">現在のステータス</div>
            <div className="flex items-center gap-4">
              <div className={`text-3xl font-bold tracking-wide ${currentSession ? (isLightTheme ? 'text-slate-900' : 'text-green-400') : 'text-slate-500'}`}>
                {currentSession ? currentSession.task : '停止中'}
              </div>
              {currentSession && !isEditMode && (
                <button
                  onClick={() => setIsMemoOpen(true)}
                  className="pointer-events-auto p-3 rounded-full bg-slate-800 text-slate-400 border border-slate-700 hover:text-white hover:bg-slate-700 hover:border-slate-500 transition-all shadow-lg active:scale-95 flex-shrink-0"
                  title="メモを記録"
                >
                  <PenTool size={20} />
                </button>
              )}
            </div>
          </div>
        </div>
      </Draggable>

      {/* BR: Main Timer */}
      <Draggable
        id="timer"
        initialPosition={getUIPosition('timer')}
        isEnabled={isEditMode}
        onPositionChange={handleUIPositionChange}
        className="z-30"
        bounds={{ left: 0, top: 0, right: 0, bottom: 0 }}
      >
        <div className={`select-none text-right ${isEditMode ? '' : 'pointer-events-none'}`}>
          <div className="text-[12px] uppercase tracking-widest text-slate-400 font-bold mb-1">経過時間</div>
          <div className={`text-8xl sm:text-9xl font-mono font-bold tracking-tighter drop-shadow-2xl tabular-nums ${currentSession ? (isLightTheme ? 'text-slate-900' : 'text-white') : 'text-slate-600'}`}>
            {currentSession ? formatDuration(now - currentSession.startedAt) : "00:00:00"}
          </div>
        </div>
      </Draggable>

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
        {isEditMode && <div className="absolute top-32 text-blue-400 text-sm font-bold animate-bounce tracking-widest z-40 bg-slate-950/80 px-6 py-2 rounded-full border border-blue-500/30">設定モード実行中</div>}
        <div
          className="transition-transform duration-500 pointer-events-auto scale-[0.8] sm:scale-90 xl:scale-100"
          style={{ transform: `translateY(${config.wheelOffsetY || 0}px)` }}
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
            onMemoOpen={() => setIsMemoOpen(true)}
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
        <div className="fixed top-8 left-1/2 -translate-x-1/2 bg-slate-800 border border-slate-700 text-white pl-6 pr-4 py-4 rounded-full shadow-2xl flex items-center gap-6 z-[1200] animate-in slide-in-from-top-5 fade-in duration-300">
          <span className="text-lg font-bold tracking-wide">{undoInfo.type === 'stop' ? 'タスク停止' : '自動切り替え'}</span>
          <button onClick={handleUndo} className="bg-slate-100 text-slate-900 px-6 py-2 rounded-full text-sm font-black hover:bg-white transition-colors">元に戻す</button>
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
        onUpdateMemo={updateLogMemo}
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
          setCurrentMemo(memo);
          // Update memo while explicitly preserving task and startedAt
          setActiveSessions(prev => {
            const current = prev[currentLine];
            if (!current) return prev; // No active session, don't update
            return {
              ...prev,
              [currentLine]: {
                task: current.task,
                startedAt: current.startedAt,
                memo: memo
              }
            };
          });
        }}
        lineName={config.lines[currentLine].name}
        presets={config.lines[currentLine].memoPresets || []}
        onPresetsChange={(newPresets) => {
          setConfig(prev => ({
            ...prev,
            lines: {
              ...prev.lines,
              [currentLine]: { ...prev.lines[currentLine], memoPresets: newPresets }
            }
          }));
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