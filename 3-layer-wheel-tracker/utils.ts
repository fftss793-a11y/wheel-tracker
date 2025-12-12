import { ActiveSession, LineId } from './types';

export const uuid = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

export const formatDuration = (ms: number): string => {
  const sec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  
  const pad = (n: number) => String(n).padStart(2, '0');
  
  if (h > 0) {
    return `${h}:${pad(m)}:${pad(s)}`;
  }
  return `${pad(m)}:${pad(s)}`;
};

export const formatDateTime = (ms: number): string => {
  return new Date(ms).toLocaleString();
};

export const formatDurationVerbose = (start: number, end: number): string => {
  const sec = Math.max(0, Math.round((end - start) / 1000));
  if (sec < 60) return `${sec}秒`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s > 0 ? `${m}分${s}秒` : `${m}分`;
};

// SVG Path Generator for Annular Sectors
export const annularSector = (r1: number, r2: number, a0: number, a1: number) => {
  // SVG coordinates: 0 degrees is usually 3 o'clock. We want 12 o'clock to be start?
  // Actually, standard math (cos, sin) 0 is 3 o'clock.
  // We can just use standard math and rotate the whole group if needed.
  // The original code used -Math.PI/2 offset.
  
  const large = (a1 - a0) > Math.PI ? 1 : 0;
  
  const x0o = r2 * Math.cos(a0);
  const y0o = r2 * Math.sin(a0);
  const x1o = r2 * Math.cos(a1);
  const y1o = r2 * Math.sin(a1);
  
  const x1i = r1 * Math.cos(a1);
  const y1i = r1 * Math.sin(a1);
  const x0i = r1 * Math.cos(a0);
  const y0i = r1 * Math.sin(a0);

  return `M ${x0o.toFixed(2)} ${y0o.toFixed(2)} ` +
         `A ${r2} ${r2} 0 ${large} 1 ${x1o.toFixed(2)} ${y1o.toFixed(2)} ` +
         `L ${x1i.toFixed(2)} ${y1i.toFixed(2)} ` +
         `A ${r1} ${r1} 0 ${large} 0 ${x0i.toFixed(2)} ${y0i.toFixed(2)} ` +
         `Z`;
};

export const getLabelCoords = (r1: number, r2: number, a0: number, a1: number) => {
  const rMid = (r1 + r2) / 2;
  const aMid = (a0 + a1) / 2;
  return {
    x: rMid * Math.cos(aMid),
    y: rMid * Math.sin(aMid)
  };
};

export const getElapsedTime = (session: ActiveSession | null): string => {
  if (!session) return '-';
  return formatDuration(Date.now() - session.startedAt);
};
