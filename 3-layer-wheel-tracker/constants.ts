import { AppConfig, LineId } from './types';

export const LINES: LineId[] = ['A', 'B', 'C', 'D', 'E', 'F'];

// Neon / High Contrast Colors for Dark Mode
export const LINE_COLORS: Record<LineId, string> = {
  A: '#3b82f6', // Blue (Bright)
  B: '#10b981', // Emerald (Bright)
  C: '#f59e0b', // Amber (Bright)
  D: '#8b5cf6', // Violet (Bright)
  E: '#64748b', // Slate (Rest)
  F: '#ec4899', // Pink (Bright)
};

export const TASK_COLORS: Record<string, string> = {
  "稼働": "#22c55e", // Green (Production)
  "生産": "#22c55e", // Green (Production)
  "トラブル": "#ef4444", // Red (Trouble)
  "停止": "#ef4444", // Red (Stop)
  "待機": "#eab308", // Yellow (Wait)
  "段取り": "#3b82f6", // Blue (Setup)
  "休憩": "#64748b", // Slate (Break)
  "計画休憩": "#3b82f6", // Blue (Planned Rest)
  "調整休憩": "#6366f1", // Indigo (Adjustment Rest)
  "立ち下げ": "#475569", // Dark Slate (Shutdown)
};

export const LINE_BG_COLORS: Record<LineId, string> = {
  A: 'bg-blue-500',
  B: 'bg-emerald-500',
  C: 'bg-amber-500',
  D: 'bg-violet-500',
  E: 'bg-slate-500',
  F: 'bg-pink-500',
};

export const DEFAULT_CONFIG: AppConfig = {
  lines: {
    A: {
      name: 'LINE A',
      categories: [
        "生産",
        { name: "段取り", subCategories: ["Lot切替", "材料補給", "調整", "始業点検"] },
        { name: "トラブル", subCategories: ["設備故障", "材料不良", "品質異常", "部品欠品", "その他"] },
        { name: "停止", subCategories: ["計画停止", "手待ち"] }
      ]
    },
    B: {
      name: 'LINE B',
      categories: [
        "生産",
        { name: "段取り", subCategories: ["Lot切替", "材料補給", "調整", "始業点検"] },
        { name: "トラブル", subCategories: ["設備故障", "材料不良", "品質異常", "部品欠品", "その他"] },
        { name: "停止", subCategories: ["計画停止", "手待ち"] }
      ]
    },
    C: {
      name: 'LINE C',
      categories: [
        "生産",
        { name: "段取り", subCategories: ["Lot切替", "材料補給", "調整", "始業点検"] },
        { name: "トラブル", subCategories: ["設備故障", "材料不良", "品質異常", "部品欠品", "その他"] },
        { name: "停止", subCategories: ["計画停止", "手待ち"] }
      ]
    },
    D: {
      name: 'LINE D',
      categories: [
        "生産",
        { name: "段取り", subCategories: ["Lot切替", "材料補給", "調整", "始業点検"] },
        { name: "トラブル", subCategories: ["設備故障", "材料不良", "品質異常", "部品欠品", "その他"] },
        { name: "停止", subCategories: ["計画停止", "手待ち"] }
      ]
    },
    E: {
      name: '休憩',
      categories: [
        "計画休憩",
        "調整休憩"
      ]
    },
    F: {
      name: 'LINE F',
      categories: [
        "生産",
        { name: "段取り", subCategories: ["Lot切替", "材料補給", "調整", "始業点検"] },
        { name: "トラブル", subCategories: ["設備故障", "材料不良", "品質異常", "部品欠品", "その他"] },
        { name: "停止", subCategories: ["計画停止", "手待ち"] }
      ]
    },
  },
  breakAlerts: ['10:00', '11:45', '15:00'],  // Fixed break time alerts
  maxSessionMin: 540,
  maxSessionAction: 'stop',
  centerIdleAction: 'resume',
  quickResumeMin: 10,
  uiScale: 1.0,
  theme: 'dark'
};

// Wheel Geometry (Scaled Up +20% from previous 30-40% increase)
// New Target Diameter: ~672px (Normal) / ~816px (Expanded)
export const INNER_R = 96;        // 80 * 1.2
export const OUTER_R = 252;       // 210 * 1.2
export const LINE_INNER_R = 252;  // 210 * 1.2
export const LINE_OUTER_R = 336;  // 280 * 1.2

// Expanded State (When sub-menu is open)
export const EXPANDED_LINE_INNER_R = 348; // 290 * 1.2
export const EXPANDED_LINE_OUTER_R = 408; // 340 * 1.2