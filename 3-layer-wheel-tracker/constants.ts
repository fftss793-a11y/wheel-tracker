import { AppConfig, LineId } from './types';

export const LINES: LineId[] = ['A', 'B', 'C', 'D', 'E'];

// Neon / High Contrast Colors for Dark Mode
export const LINE_COLORS: Record<LineId, string> = {
  A: '#3b82f6', // Blue (Bright)
  B: '#10b981', // Emerald (Bright)
  C: '#f59e0b', // Amber (Bright)
  D: '#8b5cf6', // Violet (Bright)
  E: '#ef4444', // Red (Bright)
};

export const LINE_BG_COLORS: Record<LineId, string> = {
  A: 'bg-blue-500',
  B: 'bg-emerald-500',
  C: 'bg-amber-500',
  D: 'bg-violet-500',
  E: 'bg-red-500',
};

export const DEFAULT_CONFIG: AppConfig = {
  lines: {
    A: {
      name: 'LINE A',
      categories: [
        { name: "生産", subCategories: ["有人稼働", "無人稼働", "試作"] },
        { name: "段取り", subCategories: ["型替・切替", "材料補給", "調整・空運転", "始業点検"] },
        { name: "トラブル", subCategories: ["設備故障", "材料不良", "品質異常", "部品欠品", "その他"] },
        { name: "停止", subCategories: ["計画停止", "手待ち", "朝礼・MTG", "清掃・5S"] },
        "休憩"
      ]
    },
    B: {
      name: 'LINE B',
      categories: [
        { name: "生産", subCategories: ["有人稼働", "無人稼働", "試作"] },
        { name: "段取り", subCategories: ["型替・切替", "材料補給", "調整・空運転", "始業点検"] },
        { name: "トラブル", subCategories: ["設備故障", "材料不良", "品質異常", "部品欠品", "その他"] },
        { name: "停止", subCategories: ["計画停止", "手待ち", "朝礼・MTG", "清掃・5S"] },
        "休憩"
      ]
    },
    C: {
      name: 'LINE C',
      categories: [
        { name: "生産", subCategories: ["有人稼働", "無人稼働", "試作"] },
        { name: "段取り", subCategories: ["型替・切替", "材料補給", "調整・空運転", "始業点検"] },
        { name: "トラブル", subCategories: ["設備故障", "材料不良", "品質異常", "部品欠品", "その他"] },
        { name: "停止", subCategories: ["計画停止", "手待ち", "朝礼・MTG", "清掃・5S"] },
        "休憩"
      ]
    },
    D: {
      name: 'LINE D',
      categories: [
        { name: "生産", subCategories: ["有人稼働", "無人稼働", "試作"] },
        { name: "段取り", subCategories: ["型替・切替", "材料補給", "調整・空運転", "始業点検"] },
        { name: "トラブル", subCategories: ["設備故障", "材料不良", "品質異常", "部品欠品", "その他"] },
        { name: "停止", subCategories: ["計画停止", "手待ち", "朝礼・MTG", "清掃・5S"] },
        "休憩"
      ]
    },
    E: {
      name: 'LINE E',
      categories: [
        { name: "生産", subCategories: ["有人稼働", "無人稼働", "試作"] },
        { name: "段取り", subCategories: ["型替・切替", "材料補給", "調整・空運転", "始業点検"] },
        { name: "トラブル", subCategories: ["設備故障", "材料不良", "品質異常", "部品欠品", "その他"] },
        { name: "停止", subCategories: ["計画停止", "手待ち", "朝礼・MTG", "清掃・5S"] },
        "休憩"
      ]
    },
  },
  breakAlerts: ['10:00', '11:45', '15:00'],  // Fixed break time alerts
  maxSessionMin: 540,
  maxSessionAction: 'stop',
  centerIdleAction: 'resume',
  quickResumeMin: 10,
  uiScale: 1.0
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