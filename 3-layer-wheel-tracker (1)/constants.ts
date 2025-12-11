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
    A: { name: 'LINE A', categories: ["段取り", "稼働", "停止", "待機", { name: "トラブル", subCategories: ["設備故障", "材料不良", "品質異常", "その他"] }, "休憩"] },
    B: { name: 'LINE B', categories: ["段取り", "稼働", "停止", "待機", { name: "トラブル", subCategories: ["設備故障", "材料不良", "品質異常", "その他"] }, "休憩"] },
    C: { name: 'LINE C', categories: ["段取り", "稼働", "停止", "待機", { name: "トラブル", subCategories: ["設備故障", "材料不良", "品質異常", "その他"] }, "休憩"] },
    D: { name: 'LINE D', categories: ["段取り", "稼働", "停止", "待機", { name: "トラブル", subCategories: ["設備故障", "材料不良", "品質異常", "その他"] }, "休憩"] },
    E: { name: 'LINE E', categories: ["段取り", "稼働", "停止", "待機", { name: "トラブル", subCategories: ["設備故障", "材料不良", "品質異常", "その他"] }, "休憩"] },
  },
  breakAlerts: ['10:00', '11:45', '15:00'],  // Fixed break time alerts
  maxSessionMin: 540,
  maxSessionAction: 'stop',
  centerIdleAction: 'resume',
  quickResumeMin: 10
};

// Wheel Geometry (Scaled Up ~30-40% for immersive experience)
// Previous Diameter: ~400px (Outer 200)
// New Target Diameter: ~560px
export const INNER_R = 80;        // Center Button Radius (Diameter 160px)
export const OUTER_R = 210;       // Task Layer End (Radius 210 / Diameter 420)
export const LINE_INNER_R = 210;  // Line Layer Start (Gapless)
export const LINE_OUTER_R = 280;  // Line Layer End (Radius 280 / Diameter 560)