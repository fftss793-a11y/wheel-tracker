import React from 'react';
import { LineId, ActiveSessionsMap, LineConfig } from '../types';
import { LINES, LINE_COLORS } from '../constants';
import { formatDuration } from '../utils';
import { Timer, LayoutList } from 'lucide-react';

interface StatusCardsProps {
  currentLine: LineId;
  activeSessions: ActiveSessionsMap;
  configs: Record<LineId, LineConfig>;
  onSelectLine: (id: LineId) => void;
  now: number;
}

const StatusCards: React.FC<StatusCardsProps> = ({
  currentLine,
  activeSessions,
  configs,
  onSelectLine,
  now
}) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 w-full max-w-[1024px] mx-auto px-4 no-select">
      {LINES.map((line) => {
        const session = activeSessions[line];
        const isActiveLine = line === currentLine;
        const isRunning = !!session;
        const duration = session ? formatDuration(now - session.startedAt) : '--:--';
        const color = LINE_COLORS[line];

        return (
          <div
            key={line}
            onClick={() => onSelectLine(line)}
            className={`
              relative flex flex-col justify-between
              min-h-[100px] p-3 rounded-2xl cursor-pointer
              transition-all duration-200 ease-out
              bg-white border-2
              ${isActiveLine 
                ? 'shadow-lg scale-105 z-10' 
                : 'border-transparent shadow-sm hover:shadow-md hover:border-slate-100 text-slate-500'
              }
            `}
            style={{
                borderColor: isActiveLine ? color : 'transparent',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
                <div 
                    className="flex items-center justify-center w-6 h-6 rounded-md text-[11px] font-bold text-white shadow-sm"
                    style={{ backgroundColor: color }}
                >
                    {line}
                </div>
                {isRunning && (
                    <div className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: color }}></span>
                        <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: color }}></span>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col justify-end">
                 <h3 className={`text-xs font-bold uppercase tracking-wider mb-1 truncate ${isActiveLine ? 'text-slate-700' : 'text-slate-400'}`}>
                    {configs[line].name}
                 </h3>
                 <div className="flex items-center gap-1.5 mb-1">
                    <LayoutList size={12} className={isRunning ? 'text-slate-600' : 'text-slate-300'} />
                    <span className={`text-sm font-semibold truncate ${isRunning ? 'text-slate-800' : 'text-slate-400'}`}>
                        {session ? session.task : 'Idle'}
                    </span>
                 </div>
                 <div className="flex items-center gap-1.5">
                    <Timer size={12} className={isRunning ? 'text-slate-600' : 'text-slate-300'} />
                    <span className={`text-base font-mono font-medium ${isRunning ? 'text-slate-900' : 'text-slate-300'}`}>
                        {duration}
                    </span>
                 </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default StatusCards;