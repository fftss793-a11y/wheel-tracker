export type LineId = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export interface CategoryItem {
  name: string;
  subCategories?: string[];
}

export type Category = string | CategoryItem;

export interface LineConfig {
  name: string;
  categories: Category[];
  memoPresets?: string[];  // Line-specific memo presets
}

export type CenterIdleAction = 'none' | 'resume' | 'openLineRing' | 'startDefault';
export type ThemeMode = 'dark' | 'light';

export type UIElementId = 'clock' | 'controls' | 'lineStatus' | 'timer';

export interface UIPosition {
  x: number; // percentage (0-100) or pixels
  y: number; // percentage (0-100) or pixels
  anchor?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
}

export interface AppConfig {
  lines: Record<LineId, LineConfig>;
  centerIdleAction: CenterIdleAction;
  quickResumeMin: number;
  uiScale?: number;
  wheelOffsetY?: number;  // Vertical offset for wheel position (-100 to 100)
  theme: ThemeMode;
  adminPassword?: string;
  uiPositions?: Partial<Record<UIElementId, UIPosition>>;
}

export interface LogEntry {
  id: string;
  line: LineId;
  lineName: string;
  task: string;
  startedAt: number;
  endedAt: number;
  reason?: string;
  memo?: string;
}

export interface ActiveSession {
  task: string;
  startedAt: number;
  memo?: string;
}

export type ActiveSessionsMap = Record<LineId, ActiveSession | null>;

export interface UndoInfo {
  type: 'stop' | 'autostop';
  line: LineId;
  log: LogEntry;
}

export interface PromptState {
  isOpen: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}


