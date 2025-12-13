import React, { useEffect, useState } from 'react';
import { AppConfig, LineId, LogEntry, Category, CategoryItem, SavedTemplate } from '../types';
import { LINES, LINE_COLORS } from '../constants';
import { formatDateTime, formatDurationVerbose, uuid } from '../utils';
import { X, Search, FileDown, Upload, RotateCcw, Save, Pencil, Settings2, Layers, Trash2, Plus, Download } from 'lucide-react';


/* --- Prompt Modal --- */
interface PromptModalProps {
    isOpen: boolean;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export const PromptModal: React.FC<PromptModalProps> = ({ isOpen, message, onConfirm, onCancel }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[1300] backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-6 w-[90vw] max-w-[400px]">
                <p className="text-slate-200 text-base mb-6 font-medium">{message}</p>
                <div className="flex justify-end gap-3">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg font-bold text-sm transition-colors"
                    >
                        キャンセル
                    </button>
                    <button
                        onClick={onConfirm}
                        className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-bold text-sm shadow-lg shadow-blue-900/20 transition-all hover:scale-105"
                    >
                        OK
                    </button>
                </div>
            </div>
        </div>
    );
};

/* --- Fullscreen Log Modal --- */
interface LogModalProps {
    isOpen: boolean;
    onClose: () => void;
    logs: LogEntry[];
}

export const LogModal: React.FC<LogModalProps> = ({ isOpen, onClose, logs }) => {
    const [query, setQuery] = useState('');

    if (!isOpen) return null;

    const filteredLogs = logs
        .filter(l => {
            const q = query.toLowerCase();
            return (
                l.task.toLowerCase().includes(q) ||
                l.line.toLowerCase().includes(q) ||
                l.lineName.toLowerCase().includes(q) ||
                (l.reason && l.reason.toLowerCase().includes(q))
            );
        })
        .sort((a, b) => b.endedAt - a.endedAt)
        .sort((a, b) => b.endedAt - a.endedAt)
        .slice(0, 500);

    const handleExport = () => {
        const header = ['ラインID', 'ライン名', 'タスク', '開始日時', '終了日時', '所要時間(秒)', '理由', 'メモ'];
        const rows = filteredLogs.map(l => {
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

    return (
        <div className="fixed inset-0 bg-[#020617]/95 backdrop-blur-md z-[1200] flex flex-col text-slate-200 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Header */}
            <div className="flex items-center gap-4 p-4 border-b border-slate-800 bg-[#0f152a]">
                <h2 className="text-lg font-bold text-white shrink-0 flex items-center gap-2">
                    <FileDown className="w-5 h-5 text-blue-400" />
                    ログ履歴
                </h2>
                <button onClick={handleExport} className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-500 rounded-lg shrink-0 text-slate-400 hover:text-white transition-all shadow-sm mr-2" title="CSVエクスポート">
                    <Download className="w-5 h-5" />
                </button>
                <div className="flex-1 relative max-w-md ml-auto mr-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                        type="text"
                        placeholder="検索 (タスク, ライン, ID...)"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        className="w-full bg-[#1a2238] border border-slate-700 rounded-lg py-2 pl-9 pr-4 text-sm text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                    />
                </div>
                <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg shrink-0 text-slate-400 hover:text-white transition-colors">
                    <X className="w-6 h-6" />
                </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                <div className="max-w-5xl mx-auto flex flex-col gap-2">
                    {/* Header Bar */}
                    <div className="sticky top-0 z-10 grid grid-cols-[100px_1fr] md:grid-cols-[120px_1fr_1fr] gap-x-4 px-3 py-2 bg-[#020617] border-b border-slate-700 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        <div>Line</div>
                        <div>Task</div>
                        <div className="col-span-2 md:col-span-1 text-right md:text-left">Time / Detail</div>
                    </div>
                    {filteredLogs.map(log => (
                        <div key={log.id} className="grid grid-cols-[100px_1fr] md:grid-cols-[120px_1fr_1fr] gap-x-4 gap-y-1 p-3 rounded-lg border border-slate-800 bg-slate-900/50 hover:bg-slate-800/50 hover:border-slate-700 transition-all text-xs md:text-sm">
                            <div className="flex items-center">
                                <span
                                    className="px-2 py-0.5 rounded text-[10px] md:text-xs font-bold text-slate-950 mr-2 shadow-[0_0_10px_-3px_currentColor]"
                                    style={{ backgroundColor: LINE_COLORS[log.line], color: '#000' }}
                                >
                                    {log.line}
                                </span>
                                <span className="truncate opacity-80 font-mono text-xs">{log.lineName}</span>
                            </div>
                            <div className="font-bold text-white tracking-wide">{log.task}</div>
                            <div className="col-span-2 md:col-span-1 text-slate-400 font-mono text-xs flex items-center gap-2 justify-end flex-wrap">
                                {formatDateTime(log.startedAt)}
                                <span className="opacity-30">→</span>
                                {formatDateTime(log.endedAt)}
                                <span className="ml-3 text-blue-300 font-bold">({formatDurationVerbose(log.startedAt, log.endedAt)})</span>
                                {log.reason && <span className="ml-2 text-amber-500 text-[10px] border border-amber-500/30 px-1.5 py-0.5 rounded bg-amber-500/10">{log.reason}</span>}
                                {log.memo && <span className="ml-2 text-green-400 text-[10px] border border-green-500/30 px-1.5 py-0.5 rounded bg-green-500/10">📝 {log.memo}</span>}
                            </div>
                        </div>
                    ))}
                    {filteredLogs.length === 0 && <div className="text-center py-20 text-slate-600 font-mono">NO LOGS FOUND</div>}
                </div>
            </div>
        </div>
    );
};

/* --- Specific Line Settings Modal --- */
interface LineSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    lineId: LineId;
    config: AppConfig;
    onSave: (lineId: LineId, newName: string, newCats: Category[]) => void;
}

// Helper to convert Category to editable format
interface EditableCategory {
    name: string;
    subCategories: string;
}

const categoryToEditable = (cat: Category): EditableCategory => {
    if (typeof cat === 'string') {
        return { name: cat, subCategories: '' };
    }
    return { name: cat.name, subCategories: (cat.subCategories || []).join(', ') };
};

const editableToCategory = (edit: EditableCategory): Category => {
    const trimmedSubs = edit.subCategories.split(',').map(s => s.trim()).filter(s => s.length > 0);
    if (trimmedSubs.length > 0) {
        return { name: edit.name, subCategories: trimmedSubs };
    }
    return edit.name;
};

export const LineSettingsModal: React.FC<LineSettingsModalProps> = ({ isOpen, onClose, lineId, config, onSave }) => {
    const [name, setName] = useState('');
    const [categories, setCategories] = useState<EditableCategory[]>([]);
    const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

    useEffect(() => {
        if (isOpen && config.lines[lineId]) {
            setName(config.lines[lineId].name);
            setCategories(config.lines[lineId].categories.map(categoryToEditable));
            setExpandedIdx(null);
        }
    }, [isOpen, lineId, config]);

    if (!isOpen) return null;

    const updateCategory = (idx: number, field: 'name' | 'subCategories', value: string) => {
        setCategories(prev => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c));
    };

    const addCategory = () => {
        setCategories(prev => [...prev, { name: '', subCategories: '' }]);
        setExpandedIdx(categories.length);
    };

    const removeCategory = (idx: number) => {
        setCategories(prev => prev.filter((_, i) => i !== idx));
        if (expandedIdx === idx) setExpandedIdx(null);
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[1300] backdrop-blur-sm animate-in zoom-in-95 duration-200" onClick={onClose}>
            <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-[90vw] max-w-[550px] max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950">
                    <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center w-8 h-8 rounded font-black text-slate-950 shadow-[0_0_15px_-3px_currentColor]" style={{ backgroundColor: LINE_COLORS[lineId] }}>
                            {lineId}
                        </span>
                        <h2 className="text-lg font-bold text-white">ライン設定</h2>
                    </div>
                    <button onClick={onClose}><X className="text-slate-500 hover:text-white transition-colors" /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 custom-scrollbar">
                    <label className="flex flex-col gap-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">ライン正式名称</span>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="bg-slate-800 border border-slate-700 rounded-lg p-3 text-white font-bold focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                        />
                    </label>

                    <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">タスク項目</span>
                            <span className="text-[10px] text-slate-500">{categories.length} 項目</span>
                        </div>

                        <div className="flex flex-col gap-2">
                            {categories.map((cat, idx) => (
                                <div key={idx} className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
                                    <div className="flex items-center gap-2 p-2">
                                        <input
                                            type="text"
                                            value={cat.name}
                                            onChange={e => updateCategory(idx, 'name', e.target.value)}
                                            placeholder="タスク名"
                                            className="flex-1 bg-transparent text-white text-sm font-bold focus:outline-none px-2"
                                        />
                                        <button
                                            onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                                            className={`px-2 py-1 text-[10px] rounded ${cat.subCategories ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-700 text-slate-400'} hover:opacity-80 transition-opacity`}
                                        >
                                            {cat.subCategories ? `▼ ${cat.subCategories.split(',').filter(s => s.trim()).length}個` : '+ サブ'}
                                        </button>
                                        <button
                                            onClick={() => removeCategory(idx)}
                                            className="p-1 text-red-400 hover:text-red-300 transition-colors"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>

                                    {expandedIdx === idx && (
                                        <div className="p-2 pt-0 border-t border-slate-700/50">
                                            <input
                                                type="text"
                                                value={cat.subCategories}
                                                onChange={e => updateCategory(idx, 'subCategories', e.target.value)}
                                                placeholder="サブカテゴリ (カンマ区切り: 設備故障, 材料不良, ...)"
                                                className="w-full bg-slate-900 text-amber-300 text-xs p-2 rounded focus:outline-none focus:ring-1 focus:ring-amber-500"
                                            />
                                            <p className="text-[10px] text-slate-500 mt-1">例: 設備故障, 材料不良, 品質異常</p>
                                        </div>
                                    )}
                                </div>
                            ))}

                            <button
                                onClick={addCategory}
                                className="border border-dashed border-slate-600 rounded-lg p-2 text-slate-500 hover:text-slate-300 hover:border-slate-500 transition-colors text-sm"
                            >
                                + タスク追加
                            </button>
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white font-bold text-sm transition-colors">キャンセル</button>
                    <button
                        onClick={() => {
                            const newCats = categories
                                .filter(c => c.name.trim().length > 0)
                                .map(editableToCategory);
                            onSave(lineId, name, newCats);
                        }}
                        className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold shadow-lg shadow-blue-900/30 transition-all hover:scale-105"
                    >
                        <Save size={16} /> 保存
                    </button>
                </div>
            </div>
        </div>
    );
};

/* --- Global Settings Modal --- */
interface GlobalSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    config: AppConfig;
    onSave: (newConfig: AppConfig) => void;
    onReset: () => void;
}

export const GlobalSettingsModal: React.FC<GlobalSettingsModalProps> = ({ isOpen, onClose, config, onSave, onReset }) => {
    const [localConfig, setLocalConfig] = useState<AppConfig>(config);

    useEffect(() => {
        if (isOpen) setLocalConfig(JSON.parse(JSON.stringify(config)));
    }, [isOpen, config]);

    if (!isOpen) return null;

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const obj = JSON.parse(reader.result as string);
                if (obj.lines) {
                    setLocalConfig(prev => ({ ...prev, ...obj }));
                    alert('読み込みました (保存で適用)');
                }
            } catch { alert('エラー'); }
        };
        reader.readAsText(file);
    };

    const handleExport = () => {
        const blob = new Blob([JSON.stringify(localConfig, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'config.json';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[1300] backdrop-blur-sm animate-in zoom-in-95 duration-200" onClick={onClose}>
            <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-[95vw] max-w-[600px] max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Settings2 className="w-5 h-5 text-slate-400" />
                        システム全体設定
                    </h2>
                    <button onClick={onClose}><X className="text-slate-500 hover:text-white transition-colors" /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar flex flex-col gap-6">
                    {/* Automation Rules */}
                    <section>
                        <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-4 border-b border-slate-800 pb-2">自動化ルール (タイマー)</h3>
                        <div className="grid gap-4">
                            <div className="flex flex-col gap-2">
                                <span className="text-slate-300 text-sm font-medium">休憩時間の案内 (時刻)</span>
                                <div className="flex gap-2">
                                    {(localConfig.breakAlerts || ['10:00', '11:45', '15:00']).map((val, i) => (
                                        <input
                                            key={i}
                                            type="time"
                                            value={val}
                                            onChange={e => {
                                                const newAlerts = [...(localConfig.breakAlerts || ['10:00', '11:45', '15:00'])];
                                                newAlerts[i] = e.target.value;
                                                setLocalConfig({ ...localConfig, breakAlerts: newAlerts });
                                            }}
                                            className="bg-slate-800 border border-slate-700 rounded p-2 text-center text-white focus:outline-none focus:border-blue-500"
                                        />
                                    ))}
                                </div>
                                <span className="text-slate-500 text-[10px]">指定時刻になると休憩を提案します</span>
                            </div>
                            <label className="flex items-center justify-between group">
                                <span className="text-slate-300 text-sm font-medium group-hover:text-white transition-colors">最大連続時間の上限 (分)</span>
                                <div className="flex gap-2">
                                    <input
                                        type="number" min="10" max="720"
                                        value={localConfig.maxSessionMin}
                                        onChange={e => setLocalConfig({ ...localConfig, maxSessionMin: Number(e.target.value) })}
                                        className="w-20 bg-slate-800 border border-slate-700 rounded p-2 text-right text-white focus:outline-none focus:border-blue-500"
                                    />
                                    <select
                                        value={localConfig.maxSessionAction}
                                        onChange={e => setLocalConfig({ ...localConfig, maxSessionAction: e.target.value as any })}
                                        className="bg-slate-800 border border-slate-700 rounded p-2 text-white text-sm focus:outline-none focus:border-blue-500"
                                    >
                                        <option value="stop">自動終了</option>
                                        <option value="prompt">確認</option>
                                    </select>
                                </div>
                            </label>
                            <label className="flex items-center justify-between group">
                                <span className="text-slate-300 text-sm font-medium group-hover:text-white transition-colors">中央ボタン(Idle時)の動作</span>
                                <div className="flex gap-2 items-center">
                                    <select
                                        value={localConfig.centerIdleAction}
                                        onChange={e => setLocalConfig({ ...localConfig, centerIdleAction: e.target.value as any })}
                                        className="bg-slate-800 border border-slate-700 rounded p-2 text-white text-sm focus:outline-none focus:border-blue-500 text-right"
                                    >
                                        <option value="none">何もしない</option>
                                        <option value="resume">直前タスクを再開</option>
                                        <option value="startDefault">既定タスクで開始</option>
                                    </select>
                                    {localConfig.centerIdleAction === 'resume' && (
                                        <input
                                            type="number" min="1" max="60" title="再開閾値(分)"
                                            value={localConfig.quickResumeMin}
                                            onChange={e => setLocalConfig({ ...localConfig, quickResumeMin: Number(e.target.value) })}
                                            className="w-16 bg-slate-800 border border-slate-700 rounded p-2 text-right text-white focus:outline-none focus:border-blue-500"
                                        />
                                    )}
                                </div>
                            </label>
                            {/* UI Scale Setting */}
                            <label className="flex items-center justify-between group">
                                <span className="text-slate-300 text-sm font-medium group-hover:text-white transition-colors">UI サイズ (縮小/拡大)</span>
                                <div className="flex gap-2 items-center">
                                    <input
                                        type="range" min="50" max="150" step="5"
                                        value={(localConfig.uiScale || 1.0) * 100}
                                        onChange={e => setLocalConfig({ ...localConfig, uiScale: Number(e.target.value) / 100 })}
                                        className="w-32 accent-blue-500"
                                    />
                                    <span className="w-12 text-right text-white font-mono text-sm">
                                        {Math.round((localConfig.uiScale || 1.0) * 100)}%
                                    </span>
                                </div>
                            </label>
                        </div>
                    </section>

                    {/* Data Mgmt */}
                    <section>
                        <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-4 border-b border-slate-800 pb-2">データ管理</h3>
                        <div className="grid grid-cols-4 gap-3">
                            <button onClick={handleExport} className="flex flex-col items-center gap-2 p-3 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors border border-slate-700">
                                <FileDown size={20} className="text-slate-400" />
                                <span className="text-xs font-bold text-slate-300">設定書出</span>
                            </button>
                            <label className="flex flex-col items-center gap-2 p-3 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors border border-slate-700 cursor-pointer">
                                <Upload size={20} className="text-slate-400" />
                                <span className="text-xs font-bold text-slate-300">設定取込</span>
                                <input type="file" accept=".json" className="hidden" onChange={handleImport} />
                            </label>
                            <button onClick={() => { if (confirm('設定を初期化しますか？')) onReset(); }} className="flex flex-col items-center gap-2 p-3 bg-slate-800 rounded-lg hover:bg-red-900/30 transition-colors border border-slate-700 hover:border-red-800">
                                <RotateCcw size={20} className="text-red-500" />
                                <span className="text-xs font-bold text-red-400">初期化</span>
                            </button>
                            <button onClick={() => {
                                if (confirm('すべてのログを削除しますか？この操作は取り消せません。')) {
                                    ['A', 'B', 'C', 'D', 'E'].forEach(line => localStorage.removeItem(`timelogs_v2_${line}`));
                                    alert('ログを削除しました');
                                }
                            }} className="flex flex-col items-center gap-2 p-3 bg-slate-800 rounded-lg hover:bg-red-900/30 transition-colors border border-slate-700 hover:border-red-800">
                                <X size={20} className="text-red-500" />
                                <span className="text-xs font-bold text-red-400">ログ削除</span>
                            </button>
                        </div>
                    </section>
                </div>

                <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white font-bold text-sm transition-colors">キャンセル</button>
                    <button
                        onClick={() => onSave(localConfig)}
                        className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold shadow-lg shadow-blue-900/30 transition-all hover:scale-105"
                    >
                        <Save size={16} /> 設定を保存
                    </button>
                </div>
            </div>
        </div>
    );
};

/* --- Memo Modal --- */
interface MemoModalProps {
    isOpen: boolean;
    onClose: () => void;
    memo: string;
    onSave: (memo: string) => void;
}

export const MemoModal: React.FC<MemoModalProps> = ({ isOpen, onClose, memo, onSave }) => {
    const [localMemo, setLocalMemo] = useState(memo);

    useEffect(() => {
        if (isOpen) setLocalMemo(memo);
    }, [isOpen, memo]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[1300] backdrop-blur-sm animate-in zoom-in-95 duration-200" onClick={onClose}>
            <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-[90vw] max-w-[400px]" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        📝 メモ入力
                    </h2>
                    <button onClick={onClose}><X className="text-slate-500 hover:text-white transition-colors" /></button>
                </div>

                <div className="p-6">
                    <textarea
                        value={localMemo}
                        onChange={e => setLocalMemo(e.target.value)}
                        placeholder="メモを入力..."
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 h-[120px] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all resize-none"
                        autoFocus
                    />
                </div>

                <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white font-bold text-sm transition-colors">キャンセル</button>
                    <button
                        onClick={() => { onSave(localMemo); onClose(); }}
                        className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-bold shadow-lg shadow-green-900/30 transition-all hover:scale-105"
                    >
                        <Save size={16} /> 保存
                    </button>
                </div>
            </div>
        </div>
    );
};

/* --- Help Modal --- */
interface HelpModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[1300] backdrop-blur-sm animate-in zoom-in-95 duration-200" onClick={onClose}>
            <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-[95vw] max-w-[600px] max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        ❓ 使い方ガイド
                    </h2>
                    <button onClick={onClose}><X className="text-slate-500 hover:text-white transition-colors" /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-6 text-slate-300 text-sm">
                    {/* Basic Usage */}
                    <section>
                        <h3 className="text-blue-400 font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
                            🎯 基本操作
                        </h3>
                        <ul className="space-y-2 ml-4">
                            <li><span className="text-white font-bold">ホイール内側</span>: タスク（段取り、稼働など）をクリックして計測開始</li>
                            <li><span className="text-white font-bold">ホイール外側</span>: ライン(A〜E)をクリックして切り替え</li>
                            <li><span className="text-white font-bold">中央ボタン</span>: 計測中はクリックで停止</li>
                            <li><span className="text-white font-bold">ダブルクリック</span>: ライン部分をダブルクリックで「立ち下げ」開始</li>
                        </ul>
                    </section>

                    {/* Header Buttons */}
                    <section>
                        <h3 className="text-blue-400 font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
                            🔘 ヘッダーボタン
                        </h3>
                        <ul className="space-y-2 ml-4">
                            <li><span className="text-white font-bold">📄 ログ</span>: 作業履歴を確認</li>
                            <li><span className="text-white font-bold">⬇️ CSV</span>: ログをCSVファイルでダウンロード</li>
                            <li><span className="text-white font-bold">⚙️ 設定</span>: 編集モードに切り替え（ライン名・タスク編集）</li>
                        </ul>
                    </section>

                    {/* Dashboard */}
                    <section>
                        <h3 className="text-blue-400 font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
                            📊 ダッシュボード
                        </h3>
                        <ul className="space-y-2 ml-4">
                            <li><span className="text-white font-bold">Current Line</span>: 現在選択中のライン</li>
                            <li><span className="text-white font-bold">Elapsed Time</span>: 計測経過時間</li>
                            <li><span className="text-white font-bold">💬 メモ</span>: 計測中にメモを追加（ログ・CSVに反映）</li>
                        </ul>
                    </section>

                    {/* Settings */}
                    <section>
                        <h3 className="text-blue-400 font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
                            ⚙️ グローバル設定
                        </h3>
                        <ul className="space-y-2 ml-4">
                            <li><span className="text-white font-bold">無操作休憩の提案</span>: 指定時間操作がないと「休憩にしますか？」と表示</li>
                            <li><span className="text-white font-bold">最大連続時間の上限</span>: 指定時間で計測を自動終了または確認</li>
                            <li><span className="text-white font-bold">中央ボタンの動作</span>: アイドル時のクリック動作を設定</li>
                        </ul>
                    </section>

                    {/* Shortcuts */}
                    <section>
                        <h3 className="text-blue-400 font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
                            ⌨️ キーボード
                        </h3>
                        <ul className="space-y-2 ml-4">
                            <li><span className="text-white font-bold">1〜5</span>: ラインA〜Eに切り替え</li>
                            <li><span className="text-white font-bold">Space</span>: 計測停止</li>
                            <li><span className="text-white font-bold">Esc</span>: モーダルを閉じる</li>
                        </ul>
                    </section>
                </div>

                <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-all hover:scale-105"
                    >
                        OK
                    </button>
                </div>
            </div>
        </div>
    );
};

/* --- Template Modal (Wheel Selection) --- */
const TEMPLATE_STORAGE_KEY = 'wheel_templates';

interface TemplateModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentConfig: AppConfig;
    onApplyTemplate: (config: AppConfig) => void;
}

const WHEEL_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#f97316', '#84cc16'];

export const TemplateModal: React.FC<TemplateModalProps> = ({ isOpen, onClose, currentConfig, onApplyTemplate }) => {
    const [templates, setTemplates] = useState<SavedTemplate[]>([]);
    const [newTemplateName, setNewTemplateName] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            const saved = localStorage.getItem(TEMPLATE_STORAGE_KEY);
            if (saved) {
                try { setTemplates(JSON.parse(saved)); } catch { setTemplates([]); }
            }
        }
    }, [isOpen]);

    const saveTemplates = (newTemplates: SavedTemplate[]) => {
        setTemplates(newTemplates);
        localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(newTemplates));
    };

    const handleSaveNew = () => {
        if (!newTemplateName.trim()) return;
        const newTemplate: SavedTemplate = {
            id: uuid(),
            name: newTemplateName.trim(),
            config: JSON.parse(JSON.stringify(currentConfig)),
            createdAt: Date.now()
        };
        saveTemplates([...templates, newTemplate]);
        setNewTemplateName('');
    };

    const handleDelete = (id: string) => {
        if (!confirm('このテンプレートを削除しますか？')) return;
        saveTemplates(templates.filter(t => t.id !== id));
    };

    const handleRename = (id: string, newName: string) => {
        saveTemplates(templates.map(t => t.id === id ? { ...t, name: newName } : t));
        setEditingId(null);
    };

    const handleApply = (template: SavedTemplate) => {
        onApplyTemplate(template.config);
        onClose();
    };

    if (!isOpen) return null;

    // Calculate wheel segments
    const n = templates.length;
    const offset = -Math.PI / 2;
    const innerR = 60;
    const outerR = 150;

    const polarToCartesian = (cx: number, cy: number, r: number, angle: number) => ({
        x: cx + r * Math.cos(angle),
        y: cy + r * Math.sin(angle)
    });

    const describeArc = (r1: number, r2: number, a0: number, a1: number) => {
        const p0 = polarToCartesian(0, 0, r1, a0);
        const p1 = polarToCartesian(0, 0, r2, a0);
        const p2 = polarToCartesian(0, 0, r2, a1);
        const p3 = polarToCartesian(0, 0, r1, a1);
        const largeArc = a1 - a0 > Math.PI ? 1 : 0;
        return `M ${p0.x} ${p0.y} L ${p1.x} ${p1.y} A ${r2} ${r2} 0 ${largeArc} 1 ${p2.x} ${p2.y} L ${p3.x} ${p3.y} A ${r1} ${r1} 0 ${largeArc} 0 ${p0.x} ${p0.y} Z`;
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[1300] backdrop-blur-sm animate-in zoom-in-95 duration-200" onClick={onClose}>
            <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-[95vw] max-w-[500px] max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Layers className="w-5 h-5 text-blue-400" />
                        テンプレート管理
                    </h2>
                    <button onClick={onClose}><X className="text-slate-500 hover:text-white transition-colors" /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar flex flex-col items-center gap-6">
                    {/* Wheel Selection */}
                    {n > 0 ? (
                        <div className="relative">
                            <svg width="320" height="320" viewBox="-160 -160 320 320" className="drop-shadow-lg">
                                {templates.map((template, i) => {
                                    const a0 = offset + (2 * Math.PI * i) / n;
                                    const a1 = offset + (2 * Math.PI * (i + 1)) / n;
                                    const midAngle = (a0 + a1) / 2;
                                    const labelR = (innerR + outerR) / 2;
                                    const lx = labelR * Math.cos(midAngle);
                                    const ly = labelR * Math.sin(midAngle);
                                    const color = WHEEL_COLORS[i % WHEEL_COLORS.length];

                                    return (
                                        <g key={template.id} className="cursor-pointer group" onClick={() => handleApply(template)}>
                                            <path
                                                d={describeArc(innerR, outerR, a0, a1)}
                                                fill={color}
                                                className="stroke-[2px] stroke-slate-950 hover:brightness-110 transition-all"
                                            />
                                            <text
                                                x={lx}
                                                y={ly}
                                                textAnchor="middle"
                                                dominantBaseline="middle"
                                                className="fill-white text-[11px] font-bold pointer-events-none select-none"
                                                style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
                                            >
                                                {template.name.length > 8 ? template.name.slice(0, 8) + '...' : template.name}
                                            </text>
                                        </g>
                                    );
                                })}
                                {/* Center */}
                                <circle r={innerR - 5} fill="#0f172a" className="stroke-[2px] stroke-slate-700" />
                                <text textAnchor="middle" dominantBaseline="middle" className="fill-slate-400 text-[10px] font-bold pointer-events-none">
                                    クリックで適用
                                </text>
                            </svg>
                        </div>
                    ) : (
                        <div className="text-slate-500 text-center py-8">
                            <Layers className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p>保存済みテンプレートがありません</p>
                        </div>
                    )}

                    {/* Template List */}
                    <div className="w-full space-y-2">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">テンプレート一覧</h3>
                        {templates.map(t => (
                            <div key={t.id} className="flex items-center gap-2 bg-slate-800 rounded-lg p-2 border border-slate-700">
                                {editingId === t.id ? (
                                    <input
                                        type="text"
                                        defaultValue={t.name}
                                        className="flex-1 bg-slate-900 text-white text-sm p-1 rounded focus:outline-none"
                                        onBlur={(e) => handleRename(t.id, e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') handleRename(t.id, e.currentTarget.value); }}
                                        autoFocus
                                    />
                                ) : (
                                    <span className="flex-1 text-white text-sm font-medium truncate">{t.name}</span>
                                )}
                                <button onClick={() => setEditingId(t.id)} className="p-1 text-slate-400 hover:text-blue-400 transition-colors">
                                    <Pencil size={14} />
                                </button>
                                <button onClick={() => handleDelete(t.id)} className="p-1 text-slate-400 hover:text-red-400 transition-colors">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Save New */}
                    <div className="w-full border-t border-slate-700 pt-4">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">現在の設定を保存</h3>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newTemplateName}
                                onChange={e => setNewTemplateName(e.target.value)}
                                placeholder="テンプレート名"
                                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg p-2 text-white text-sm focus:outline-none focus:border-blue-500"
                            />
                            <button
                                onClick={handleSaveNew}
                                disabled={!newTemplateName.trim()}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg font-bold transition-all flex items-center gap-2"
                            >
                                <Plus size={16} /> 保存
                            </button>
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
                    <button onClick={onClose} className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold transition-all">
                        閉じる
                    </button>
                </div>
            </div>
        </div>
    );
};