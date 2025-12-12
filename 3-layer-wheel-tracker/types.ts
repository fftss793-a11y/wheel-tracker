export type LineId = 'A' | 'B' | 'C' | 'D' | 'E';

export interface CategoryItem {
  name: string;
  subCategories?: string[];
}

export type Category = string | CategoryItem;

export interface LineConfig {
  name: string;
  categories: Category[];
}

export type CenterIdleAction = 'none' | 'resume' | 'openLineRing' | 'startDefault';
export type MaxSessionAction = 'stop' | 'prompt';

export interface AppConfig {
  lines: Record<LineId, LineConfig>;
  breakAlerts: string[];  // 3 configurable break time alerts in HH:MM format
  maxSessionMin: number;
  maxSessionAction: MaxSessionAction;
  centerIdleAction: CenterIdleAction;
  quickResumeMin: number;
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

export interface SavedTemplate {
  id: string;
  name: string;
  config: AppConfig;
  createdAt: number;
}
