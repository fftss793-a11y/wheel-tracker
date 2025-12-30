import React, { useEffect, useState } from 'react';
import { AppConfig, LineId, LogEntry, Category, CategoryItem } from '../types';
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
    onUpdateMemo?: (logId: string, line: LineId, newMemo: string) => void;
    onDeleteLog?: (logId: string, line: LineId) => void;
}

export const LogModal: React.FC<LogModalProps> = ({ isOpen, onClose, logs, onUpdateMemo, onDeleteLog }) => {
    const [query, setQuery] = useState('');
    const [editingLogId, setEditingLogId] = useState<string | null>(null);
    const [editMemo, setEditMemo] = useState('');
    const [deletedLogIds, setDeletedLogIds] = useState<Set<string>>(new Set());

    // Reset deleted IDs when modal opens
    useEffect(() => {
        if (isOpen) setDeletedLogIds(new Set());
    }, [isOpen]);

    // Handle delete with UI update
    const handleDelete = (logId: string, line: LineId) => {
        if (confirm('このログを削除しますか？')) {
            onDeleteLog?.(logId, line);
            setDeletedLogIds(prev => new Set(prev).add(logId));
        }
    };

    if (!isOpen) return null;

    const filteredLogs = logs
        .filter(l => !deletedLogIds.has(l.id))
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
        .slice(0, 500);

    const handleExport = () => {
        const header = ['ラインID', 'ライン名', 'タスク', '開始日時', '終了日時', '所要時間(秒)', 'メモ'];
        const rows = filteredLogs.map(l => {
            const dur = Math.round((l.endedAt - l.startedAt) / 1000);
            const escape = (s: string) => `"${String(s || '').replace(/"/g, '""')}"`;
            const formatDate = (ts: number) => new Date(ts).toLocaleString('ja-JP');
            return [l.line, escape(l.lineName), escape(l.task), escape(formatDate(l.startedAt)), escape(formatDate(l.endedAt)), dur, escape(l.memo)].join(',');
        });
        const blob = new Blob([[header.join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `timelogs_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
    };

    const handleStartEdit = (log: LogEntry) => {
        setEditingLogId(log.id);
        setEditMemo(log.memo || '');
    };

    const handleSaveEdit = (log: LogEntry) => {
        if (onUpdateMemo) {
            onUpdateMemo(log.id, log.line, editMemo);
        }
        setEditingLogId(null);
        setEditMemo('');
    };

    const handleCancelEdit = () => {
        setEditingLogId(null);
        setEditMemo('');
    };

    return (
        <div className="fixed inset-0 bg-[#020617]/95 backdrop-blur-md z-[1200] flex flex-col text-slate-200 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Header */}
            <div className="flex items-center gap-4 p-4 border-b border-slate-800 bg-[#0f152a]">
                <h2 className="text-lg font-bold text-white shrink-0 flex items-center gap-2">
                    <FileDown className="w-5 h-5 text-blue-400" />
                    ログ履歴
                    <span className="text-sm font-normal text-slate-400">({filteredLogs.length}件)</span>
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
                    <div className="sticky top-0 z-10 grid grid-cols-[100px_1fr_40px] md:grid-cols-[100px_150px_300px_1fr_40px] gap-x-4 px-3 py-2 bg-[#020617] border-b border-slate-700 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        <div>ライン</div>
                        <div>タスク</div>
                        <div className="hidden md:block">メモ</div>
                        <div className="col-span-1 text-right md:text-left">時間 / 詳細</div>
                        <div></div>
                    </div>
                    {filteredLogs.map(log => (
                        <div key={log.id} className="grid grid-cols-[100px_1fr_40px] md:grid-cols-[100px_150px_300px_1fr_40px] gap-x-4 gap-y-1 p-3 rounded-lg border border-slate-800 bg-slate-900/50 hover:bg-slate-800/50 hover:border-slate-700 transition-all text-xs md:text-sm">
                            <div className="flex items-center">
                                <span
                                    className="px-2 py-0.5 rounded text-[10px] md:text-xs font-bold text-slate-950 mr-2 shadow-[0_0_10px_-3px_currentColor]"
                                    style={{ backgroundColor: LINE_COLORS[log.line], color: '#000' }}
                                >
                                    {log.line}
                                </span>
                                <span className="truncate opacity-80 font-mono text-xs">{log.lineName}</span>
                            </div>
                            <div className="font-bold text-white tracking-wide flex items-center">
                                {log.task}
                            </div>
                            <div className="hidden md:flex items-center">
                                {editingLogId === log.id ? (
                                    <div className="flex items-center gap-1 w-full">
                                        <input
                                            type="text"
                                            value={editMemo}
                                            onChange={e => setEditMemo(e.target.value)}
                                            className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-white flex-1 focus:outline-none focus:border-blue-500 font-normal"
                                            autoFocus
                                            onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(log); if (e.key === 'Escape') handleCancelEdit(); }}
                                        />
                                        <button onClick={() => handleSaveEdit(log)} className="text-green-400 hover:text-green-300 text-sm px-1">✓</button>
                                        <button onClick={handleCancelEdit} className="text-red-400 hover:text-red-300 text-sm px-1">✕</button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => handleStartEdit(log)}
                                        className={`text-xs border px-2 py-1 rounded transition-colors font-normal max-w-full truncate ${log.memo ? 'text-green-400 border-green-500/30 bg-green-500/10 hover:bg-green-500/20' : 'text-slate-500 border-slate-600 hover:text-slate-300 hover:border-slate-500'}`}
                                    >
                                        📝 {log.memo || 'メモを追加...'}
                                    </button>
                                )}
                            </div>
                            {/* Mobile: show memo below task */}
                            <div className="md:hidden col-span-2 flex items-center mt-1">
                                {editingLogId === log.id ? (
                                    <div className="flex items-center gap-1 w-full">
                                        <input
                                            type="text"
                                            value={editMemo}
                                            onChange={e => setEditMemo(e.target.value)}
                                            className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-white flex-1 focus:outline-none focus:border-blue-500 font-normal"
                                            autoFocus
                                            onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(log); if (e.key === 'Escape') handleCancelEdit(); }}
                                        />
                                        <button onClick={() => handleSaveEdit(log)} className="text-green-400 hover:text-green-300 text-sm px-1">✓</button>
                                        <button onClick={handleCancelEdit} className="text-red-400 hover:text-red-300 text-sm px-1">✕</button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => handleStartEdit(log)}
                                        className={`text-xs border px-2 py-1 rounded transition-colors font-normal ${log.memo ? 'text-green-400 border-green-500/30 bg-green-500/10 hover:bg-green-500/20' : 'text-slate-500 border-slate-600 hover:text-slate-300 hover:border-slate-500'}`}
                                    >
                                        📝 {log.memo || 'メモを追加...'}
                                    </button>
                                )}
                            </div>
                            <div className="col-span-1 text-slate-400 font-mono text-xs flex items-center gap-2 justify-end flex-wrap">
                                {formatDateTime(log.startedAt)}
                                <span className="opacity-30">→</span>
                                {formatDateTime(log.endedAt)}
                                <span className="ml-3 text-blue-300 font-bold">({formatDurationVerbose(log.startedAt, log.endedAt)})</span>
                            </div>
                            {/* Delete Button */}
                            <div className="flex items-center justify-center row-span-2 md:row-span-1">
                                {onDeleteLog && (
                                    <button
                                        onClick={() => handleDelete(log.id, log.line)}
                                        className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                                        title="削除"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                    {filteredLogs.length === 0 && <div className="text-center py-20 text-slate-600 font-mono">ログが見つかりません</div>}
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
    isAdmin: boolean;
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

export const LineSettingsModal: React.FC<LineSettingsModalProps> = ({ isOpen, onClose, lineId, config, onSave, isAdmin }) => {
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
                                            disabled={!isAdmin}
                                        />
                                        {isAdmin && (
                                            <>
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
                                            </>
                                        )}
                                    </div>

                                    {expandedIdx === idx && isAdmin && (
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

                            {isAdmin && (
                                <button
                                    onClick={addCategory}
                                    className="border border-dashed border-slate-600 rounded-lg p-2 text-slate-500 hover:text-slate-300 hover:border-slate-500 transition-colors text-sm"
                                >
                                    + タスク追加
                                </button>
                            )}
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
    onDeleteLogs: () => void;
}

export const GlobalSettingsModal: React.FC<GlobalSettingsModalProps> = ({ isOpen, onClose, config, onSave, onReset, onDeleteLogs }) => {
    const [localConfig, setLocalConfig] = useState<AppConfig>(config);
    // Bulk Update State
    const [bulkCategories, setBulkCategories] = useState<EditableCategory[]>([]);
    const [expandedBulkIdx, setExpandedBulkIdx] = useState<number | null>(null);

    useEffect(() => {
        if (isOpen) {
            setLocalConfig(JSON.parse(JSON.stringify(config)));
            // Initialize bulk editor with Line A's categories as a template
            if (config.lines.A) {
                setBulkCategories(config.lines.A.categories.map(categoryToEditable));
            } else {
                setBulkCategories([]);
            }
        }
    }, [isOpen, config]);

    // Bulk Update Handlers
    const updateBulkCategory = (idx: number, field: 'name' | 'subCategories', value: string) => {
        setBulkCategories(prev => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c));
    };

    const addBulkCategory = () => {
        setBulkCategories(prev => [...prev, { name: '', subCategories: '' }]);
        setExpandedBulkIdx(bulkCategories.length);
    };

    const removeBulkCategory = (idx: number) => {
        setBulkCategories(prev => prev.filter((_, i) => i !== idx));
        if (expandedBulkIdx === idx) setExpandedBulkIdx(null);
    };

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
                    {/* UI Settings */}
                    <section>
                        <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-4 border-b border-slate-800 pb-2">UI設定</h3>
                        <div className="grid gap-4">
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
                                        type="range" min="30" max="150" step="5"
                                        value={(localConfig.uiScale || 1.0) * 100}
                                        onChange={e => setLocalConfig({ ...localConfig, uiScale: Number(e.target.value) / 100 })}
                                        className="w-32 accent-blue-500"
                                    />
                                    <span className="w-12 text-right text-white font-mono text-sm">
                                        {Math.round((localConfig.uiScale || 1.0) * 100)}%
                                    </span>
                                </div>
                            </label>
                            {/* Wheel Position Setting */}
                            <label className="flex items-center justify-between group">
                                <span className="text-slate-300 text-sm font-medium group-hover:text-white transition-colors">ホイール位置 (上下)</span>
                                <div className="flex gap-2 items-center">
                                    <input
                                        type="range" min="-200" max="100" step="5"
                                        value={localConfig.wheelOffsetY || 0}
                                        onChange={e => setLocalConfig({ ...localConfig, wheelOffsetY: Number(e.target.value) })}
                                        className="w-32 accent-blue-500"
                                    />
                                    <span className="w-12 text-right text-white font-mono text-sm">
                                        {localConfig.wheelOffsetY || 0}px
                                    </span>
                                </div>
                            </label>
                            {/* Theme Setting */}
                            <label className="flex items-center justify-between group">
                                <span className="text-slate-300 text-sm font-medium group-hover:text-white transition-colors">背景テーマ</span>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setLocalConfig({ ...localConfig, theme: 'dark' })}
                                        className={`px-3 py-1.5 rounded text-sm font-bold transition-all ${localConfig.theme === 'dark' ? 'bg-slate-700 text-white ring-2 ring-blue-500' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                                    >
                                        ダーク
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setLocalConfig({ ...localConfig, theme: 'light' })}
                                        className={`px-3 py-1.5 rounded text-sm font-bold transition-all ${localConfig.theme === 'light' ? 'bg-white text-slate-900 ring-2 ring-blue-500' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                                    >
                                        ライト
                                    </button>
                                </div>
                            </label>
                        </div>
                    </section>

                    {/* Bulk Category Update */}
                    <section>
                        <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-4 border-b border-slate-800 pb-2 flex items-center gap-2">
                            <Layers className="w-4 h-4" /> 全ライン共通タスク設定
                        </h3>
                        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex flex-col gap-4">

                            {/* Input Form (Copied Logic) */}
                            <div className="flex flex-col gap-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">タスク項目</span>
                                    <span className="text-[10px] text-slate-500">{bulkCategories.length} 項目</span>
                                </div>

                                <div className="flex flex-col gap-2">
                                    {bulkCategories.map((cat, idx) => (
                                        <div key={idx} className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
                                            <div className="flex items-center gap-2 p-2">
                                                <input
                                                    type="text"
                                                    value={cat.name}
                                                    onChange={e => updateBulkCategory(idx, 'name', e.target.value)}
                                                    placeholder="タスク名"
                                                    className="flex-1 bg-transparent text-white text-sm font-bold focus:outline-none px-2"
                                                />
                                                <button
                                                    onClick={() => setExpandedBulkIdx(expandedBulkIdx === idx ? null : idx)}
                                                    className={`px-2 py-1 text-[10px] rounded ${cat.subCategories ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-700 text-slate-400'} hover:opacity-80 transition-opacity`}
                                                >
                                                    {cat.subCategories ? `▼ ${cat.subCategories.split(',').filter(s => s.trim()).length}個` : '+ サブ'}
                                                </button>
                                                <button
                                                    onClick={() => removeBulkCategory(idx)}
                                                    className="p-1 text-red-400 hover:text-red-300 transition-colors"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>

                                            {expandedBulkIdx === idx && (
                                                <div className="p-2 pt-0 border-t border-slate-700/50">
                                                    <input
                                                        type="text"
                                                        value={cat.subCategories}
                                                        onChange={e => updateBulkCategory(idx, 'subCategories', e.target.value)}
                                                        placeholder="サブカテゴリ (カンマ区切り: 設備故障, 材料不良, ...)"
                                                        className="w-full bg-slate-900 text-amber-300 text-xs p-2 rounded focus:outline-none focus:ring-1 focus:ring-amber-500"
                                                    />
                                                    <p className="text-[10px] text-slate-500 mt-1">例: 設備故障, 材料不良, 品質異常</p>
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                    <button
                                        onClick={addBulkCategory}
                                        className="border border-dashed border-slate-600 rounded-lg p-2 text-slate-500 hover:text-slate-300 hover:border-slate-500 transition-colors text-sm"
                                    >
                                        + タスク追加
                                    </button>
                                </div>
                            </div>

                            <div className="text-[10px] text-amber-500 bg-amber-500/10 border border-amber-500/20 p-2 rounded flex items-center gap-2">
                                <Settings2 size={12} /> 変更すると全ライン(A-F)のタスク構成が上書きされます
                            </div>
                        </div>
                    </section>

                    {/* Data Mgmt */}
                    <section>
                        <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-4 border-b border-slate-800 pb-2">データ管理</h3>
                        <div className="grid grid-cols-4 gap-3">
                            <button type="button" onClick={handleExport} className="flex flex-col items-center gap-2 p-3 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors border border-slate-700">
                                <FileDown size={20} className="text-slate-400" />
                                <span className="text-xs font-bold text-slate-300">設定書出</span>
                            </button>
                            <label className="flex flex-col items-center gap-2 p-3 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors border border-slate-700 cursor-pointer">
                                <Upload size={20} className="text-slate-400" />
                                <span className="text-xs font-bold text-slate-300">設定取込</span>
                                <input type="file" accept=".json" className="hidden" onChange={handleImport} />
                            </label>
                            <button type="button" onClick={onReset} className="flex flex-col items-center gap-2 p-3 bg-slate-800 rounded-lg hover:bg-red-900/30 transition-colors border border-slate-700 hover:border-red-800">
                                <RotateCcw size={20} className="text-red-500" />
                                <span className="text-xs font-bold text-red-400">初期化</span>
                            </button>
                            <button type="button" onClick={onDeleteLogs} className="flex flex-col items-center gap-2 p-3 bg-slate-800 rounded-lg hover:bg-red-900/30 transition-colors border border-slate-700 hover:border-red-800">
                                <X size={20} className="text-red-500" />
                                <span className="text-xs font-bold text-red-400">ログ削除</span>
                            </button>
                        </div>
                    </section>
                </div>

                <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white font-bold text-sm transition-colors">キャンセル</button>
                    <button
                        onClick={() => {
                            // Apply bulk categories to all lines in the local config copy
                            const newCategories = bulkCategories
                                .filter(c => c.name.trim().length > 0)
                                .map(editableToCategory);

                            const newConfig = { ...localConfig };

                            // Iterate over all defined lines and apply the new categories
                            (Object.keys(newConfig.lines) as LineId[]).forEach(lineId => {
                                if (newConfig.lines[lineId]) {
                                    newConfig.lines[lineId] = {
                                        ...newConfig.lines[lineId],
                                        categories: newCategories
                                    };
                                }
                            });

                            onSave(newConfig);
                        }}
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
    lineName?: string;
    presets?: string[];
    onPresetsChange?: (newPresets: string[]) => void;
    isAdmin: boolean;
}

export const MemoModal: React.FC<MemoModalProps> = ({ isOpen, onClose, memo, onSave, lineName, presets = [], onPresetsChange, isAdmin }) => {
    const [localMemo, setLocalMemo] = useState(memo);
    const [isAddingPreset, setIsAddingPreset] = useState(false);
    const [newPresetText, setNewPresetText] = useState('');

    useEffect(() => {
        if (isOpen) {
            setLocalMemo(memo);
            setIsAddingPreset(false);
            setNewPresetText('');
        }
    }, [isOpen, memo]);

    const handlePresetClick = (preset: string) => {
        setLocalMemo(prev => prev ? `${prev}, ${preset}` : preset);
    };

    const handleAddPreset = () => {
        if (newPresetText.trim() && onPresetsChange) {
            onPresetsChange([...presets, newPresetText.trim()]);
            setNewPresetText('');
            setIsAddingPreset(false);
        }
    };

    const handleDeletePreset = (index: number) => {
        if (onPresetsChange && confirm('このプリセットを削除しますか？')) {
            onPresetsChange(presets.filter((_, i) => i !== index));
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[1300] backdrop-blur-sm animate-in zoom-in-95 duration-200" onClick={onClose}>
            <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-[90vw] max-w-[450px]" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        📝 メモ入力 {lineName && <span className="text-sm text-slate-400">({lineName})</span>}
                    </h2>
                    <button onClick={onClose}><X className="text-slate-500 hover:text-white transition-colors" /></button>
                </div>

                <div className="p-4 space-y-4">
                    {/* Presets Section */}
                    {onPresetsChange && (
                        <div className="flex flex-wrap gap-2">
                            {presets.map((preset, i) => (
                                <button
                                    key={i}
                                    onClick={() => handlePresetClick(preset)}
                                    onContextMenu={(e) => { e.preventDefault(); if (isAdmin) handleDeletePreset(i); }}
                                    className={`px-3 py-1.5 bg-blue-600/20 text-blue-300 border border-blue-500/30 rounded-lg text-sm font-medium hover:bg-blue-600/30 hover:border-blue-500/50 transition-all ${!isAdmin ? 'cursor-pointer' : 'cursor-context-menu'}`}
                                    title={isAdmin ? "クリックで追加、右クリックで削除" : "クリックで追加"}
                                >
                                    {preset}
                                </button>
                            ))}
                            {isAddingPreset && isAdmin ? (
                                <div className="flex items-center gap-1">
                                    <input
                                        type="text"
                                        value={newPresetText}
                                        onChange={e => setNewPresetText(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') handleAddPreset(); if (e.key === 'Escape') setIsAddingPreset(false); }}
                                        placeholder="新規プリセット"
                                        className="px-2 py-1 bg-slate-800 border border-slate-600 rounded text-sm text-white w-28 focus:outline-none focus:border-green-500"
                                        autoFocus
                                    />
                                    <button onClick={handleAddPreset} className="text-green-400 hover:text-green-300 px-1">✓</button>
                                    <button onClick={() => setIsAddingPreset(false)} className="text-red-400 hover:text-red-300 px-1">✕</button>
                                </div>
                            ) : isAdmin && (
                                <button
                                    onClick={() => setIsAddingPreset(true)}
                                    className="px-3 py-1.5 bg-slate-800 text-slate-400 border border-dashed border-slate-600 rounded-lg text-sm hover:text-slate-200 hover:border-slate-500 transition-all flex items-center gap-1"
                                >
                                    <Plus size={14} /> 追加
                                </button>
                            )}
                        </div>
                    )}

                    {/* Text Input */}
                    <textarea
                        value={localMemo}
                        onChange={e => setLocalMemo(e.target.value)}
                        placeholder="メモを入力..."
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 h-[100px] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all resize-none"
                        autoFocus={!onPresetsChange}
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
                            <li><span className="text-white font-bold">ホイール内側</span>: タスクをクリックして計測開始</li>
                            <li><span className="text-white font-bold">ホイール外側</span>: ライン(A〜F)をクリックして切り替え</li>
                            <li><span className="text-white font-bold">中央ボタン</span>: 計測中はクリックで停止</li>
                            <li><span className="text-white font-bold">右クリック</span>: 計測中にタスクを右クリックでメモ入力</li>
                            <li><span className="text-white font-bold">サブカテゴリ</span>: タスクにサブカテゴリがある場合、ホバーで展開</li>
                        </ul>
                    </section>

                    {/* Settings Menu */}
                    <section>
                        <h3 className="text-blue-400 font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
                            ⚙️ 設定メニュー（右上の歯車アイコン）
                        </h3>
                        <ul className="space-y-2 ml-4">
                            <li><span className="text-white font-bold">🚪 終業</span>: タスク停止 → CSV保存 → ログクリア</li>
                            <li><span className="text-white font-bold">📁 テンプレート</span>: 設定を保存・読み込み</li>
                            <li><span className="text-white font-bold">📄 ログ</span>: 作業履歴を確認・メモ編集・CSVエクスポート</li>
                            <li><span className="text-white font-bold">🎛️ 全体設定</span>: UI・テーマの設定</li>
                            <li><span className="text-white font-bold">❓ ヘルプ</span>: この画面</li>
                        </ul>
                        <p className="mt-2 text-slate-500 text-xs">※ ホイールのライン部分をクリックするとライン名・タスク項目を編集できます</p>
                    </section>

                    {/* Dashboard */}
                    <section>
                        <h3 className="text-blue-400 font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
                            📊 ダッシュボード（四隅の表示）
                        </h3>
                        <ul className="space-y-2 ml-4">
                            <li><span className="text-white font-bold">左上</span>: 現在時刻・日付</li>
                            <li><span className="text-white font-bold">左下</span>: 選択中ライン・タスク名・メモボタン</li>
                            <li><span className="text-white font-bold">右下</span>: 経過時間</li>
                        </ul>
                    </section>

                    {/* Global Settings */}
                    <section>
                        <h3 className="text-blue-400 font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
                            🎛️ 全体設定の項目
                        </h3>
                        <ul className="space-y-2 ml-4">
                            <li><span className="text-white font-bold">中央ボタンの動作</span>: アイドル時のクリック動作を設定</li>
                            <li><span className="text-white font-bold">UIサイズ</span>: ホイールの拡大・縮小</li>
                            <li><span className="text-white font-bold">ホイール位置</span>: 上下位置の調整</li>
                            <li><span className="text-white font-bold">背景テーマ</span>: ダーク/ライト切り替え</li>
                        </ul>
                    </section>

                    {/* Shortcuts */}
                    <section>
                        <h3 className="text-blue-400 font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
                            ⌨️ キーボードショートカット
                        </h3>
                        <ul className="space-y-2 ml-4">
                            <li><span className="text-white font-bold">1〜6</span>: ラインA〜Fに切り替え</li>
                            <li><span className="text-white font-bold">Space</span>: 計測停止</li>
                            <li><span className="text-white font-bold">Esc</span>: モーダルを閉じる / 設定モード終了</li>
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

