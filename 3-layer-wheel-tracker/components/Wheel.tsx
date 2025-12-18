import React, { useMemo, useState } from 'react';
import { LINE_COLORS, OUTER_R, INNER_R, LINE_OUTER_R, LINE_INNER_R, LINES, EXPANDED_LINE_INNER_R, EXPANDED_LINE_OUTER_R, TASK_COLORS } from '../constants';
import { annularSector, getLabelCoords } from '../utils';
import { LineId, ActiveSessionsMap, Category, CategoryItem } from '../types';
import { Activity, Pencil } from 'lucide-react';

// Helper to get category name
const getCategoryName = (cat: Category): string => typeof cat === 'string' ? cat : cat.name;
const getCategorySubItems = (cat: Category): string[] | undefined => typeof cat === 'string' ? undefined : cat.subCategories;

interface WheelProps {
  currentLine: LineId;
  categories: Category[];
  lineNames: Record<LineId, string>;
  isTracking: boolean;
  currentTask: string;
  activeSessions: ActiveSessionsMap;
  isEditMode: boolean;
  onTaskClick: (task: string) => void;
  onLineClick: (line: LineId) => void;
  onLineDoubleClick: (line: LineId) => void;
  onCenterClick: () => void;
  hudData?: {
    lineName: string;
    timeString: string;
    activityString: string;
    isRecording: boolean;
  };
}

// Sub-category layer radius (between task and line layer)
const SUB_INNER_R = LINE_INNER_R;
const SUB_OUTER_R = LINE_OUTER_R;

const Wheel: React.FC<WheelProps> = ({
  currentLine,
  categories,
  lineNames,
  isTracking,
  currentTask,
  activeSessions,
  isEditMode,
  onTaskClick,
  onLineClick,
  onLineDoubleClick,
  onCenterClick,
}) => {
  const [expandedTask, setExpandedTask] = useState<string | null>(null);

  const n = categories.length;
  const offset = -Math.PI / 2;
  const currentColor = LINE_COLORS[currentLine];

  // Find expanded category info
  const expandedCategoryInfo = useMemo(() => {
    if (!expandedTask) return null;
    const idx = categories.findIndex(c => getCategoryName(c) === expandedTask);
    if (idx === -1) return null;
    const cat = categories[idx];
    const subItems = getCategorySubItems(cat);
    if (!subItems || subItems.length === 0) return null;

    // Calculate the angle range for this task segment
    const a0 = offset + (2 * Math.PI * idx) / n;
    const a1 = offset + (2 * Math.PI * (idx + 1)) / n;

    return { name: expandedTask, subItems, a0, a1, idx };
  }, [expandedTask, categories, n, offset]);

  const handleTaskClick = (cat: Category) => {
    if (isEditMode) return;

    const name = getCategoryName(cat);
    const subItems = getCategorySubItems(cat);

    if (subItems && subItems.length > 0) {
      // Has sub-categories - clicking when expanded selects the parent
      if (expandedTask === name) {
        // Already expanded, do nothing (select from sub-menu)
        return;
      }
      // Not expanded yet, expand on click as fallback
      setExpandedTask(name);
    } else {
      // No sub-categories, start tracking directly
      setExpandedTask(null);
      onTaskClick(name);
    }
  };

  const handleTaskHover = (cat: Category) => {
    if (isEditMode) return;
    const name = getCategoryName(cat);
    const subItems = getCategorySubItems(cat);

    if (subItems && subItems.length > 0) {
      // Has sub-categories - expand this one
      setExpandedTask(name);
    } else {
      // No sub-categories - close any expanded sub-wheel
      if (expandedTask) setExpandedTask(null);
    }
  };

  const handleSubCategoryClick = (parentName: string, subName: string) => {
    setExpandedTask(null);
    onTaskClick(`${parentName} > ${subName}`);
  };

  // --- Task Segments (Inner Layer) ---
  const taskSegments = useMemo(() => {
    return categories.map((cat, i) => {
      const name = getCategoryName(cat);
      const hasSubItems = getCategorySubItems(cat)?.length ?? 0 > 0;
      const a0 = offset + (2 * Math.PI * i) / n;
      const a1 = offset + (2 * Math.PI * (i + 1)) / n;
      const d = annularSector(INNER_R, OUTER_R, a0, a1);
      const { x, y } = getLabelCoords(INNER_R, OUTER_R, a0, a1);

      const isCurrentTask = !isEditMode && isTracking && currentTask.startsWith(name);
      const isExpanded = expandedTask === name;

      // Determine color based on task name
      const taskColor = TASK_COLORS[name] || '#64748b';

      return (
        <g
          key={i}
          className={`group ${isEditMode ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}`}
          onClick={() => handleTaskClick(cat)}
          onMouseEnter={() => handleTaskHover(cat)}
        >
          {/* Base Segment */}
          <path
            d={d}
            className={`
              stroke-[3px] stroke-slate-950 transition-all duration-200
              ${isCurrentTask
                ? 'brightness-125'
                : isExpanded
                  ? 'brightness-110'
                  : 'hover:brightness-110'
              }
            `}
            style={{
              fill: isCurrentTask ? taskColor : (isExpanded ? taskColor : (taskColor + 'cc')), // slight transparency if inactive
            }}
          />

          {/* Text */}
          <text
            x={x}
            y={y}
            className={`
              pointer-events-none text-[20px] font-black tracking-wide select-none transition-colors drop-shadow-md
              fill-white
            `}
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {name}
          </text>

          {/* Sub-category indicator */}
          {hasSubItems && !isEditMode && (
            <text
              x={x}
              y={y + 18}
              className="pointer-events-none text-[12px] fill-white/80 select-none font-bold"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              ▼
            </text>
          )}
        </g>
      );
    });
  }, [categories, n, offset, currentColor, isTracking, currentTask, isEditMode, expandedTask]);

  // --- Sub-Category Segments (Expanded Fan) ---
  const subCategorySegments = useMemo(() => {
    if (!expandedCategoryInfo || isEditMode) return null;

    const { name, subItems, a0, a1 } = expandedCategoryInfo;
    const subCount = subItems.length;
    const segmentAngle = (a1 - a0) / subCount;
    // Parent task color
    const taskColor = TASK_COLORS[name] || currentColor;

    return (
      <g className="animate-in fade-in zoom-in-95 duration-200">
        {subItems.map((subName, i) => {
          const subA0 = a0 + segmentAngle * i;
          const subA1 = a0 + segmentAngle * (i + 1);
          const d = annularSector(SUB_INNER_R, SUB_OUTER_R, subA0, subA1);
          const { x, y } = getLabelCoords(SUB_INNER_R, SUB_OUTER_R, subA0, subA1);

          return (
            <g
              key={i}
              className="cursor-pointer group"
              onClick={(e) => { e.stopPropagation(); handleSubCategoryClick(name, subName); }}
            >
              <path
                d={d}
                style={{ fill: taskColor }}
                className="hover:brightness-110 stroke-[3px] stroke-slate-950 transition-all duration-150"
              />
              <text
                x={x}
                y={y}
                className="pointer-events-none text-[14px] font-bold fill-white select-none drop-shadow-sm"
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {subName}
              </text>
            </g>
          );
        })}
      </g>
    );
  }, [expandedCategoryInfo, isEditMode, currentColor]);

  // --- Line Segments (Outer Layer) ---
  const lineSegments = useMemo(() => {
    // If expanded, push lines outward using new radii
    const rInner = expandedTask ? EXPANDED_LINE_INNER_R : LINE_INNER_R;
    const rOuterBase = expandedTask ? EXPANDED_LINE_OUTER_R : LINE_OUTER_R;

    const ln = LINES.length;
    return LINES.map((line, i) => {
      const a0 = offset + (2 * Math.PI * i) / ln;
      const a1 = offset + (2 * Math.PI * (i + 1)) / ln;

      const isActiveLine = line === currentLine;
      const isRunning = !!activeSessions[line];
      const lineColor = LINE_COLORS[line];
      const rOuter = isActiveLine ? rOuterBase + 12 : rOuterBase; // More pop

      const d = annularSector(rInner, rOuter, a0, a1);
      const { x, y } = getLabelCoords(rInner, rOuterBase, a0, a1);

      return (
        <g
          key={line}
          className="group cursor-pointer"
          onClick={(e) => { e.stopPropagation(); onLineClick(line); }}
          onDoubleClick={(e) => { e.stopPropagation(); onLineDoubleClick(line); }}
          onMouseEnter={() => { if (expandedTask) setExpandedTask(null); }}
        >
          {/* Segment Background */}
          <path
            d={d}
            className={`
              stroke-[3px] stroke-slate-950 transition-all duration-300
              ${isEditMode ? 'hover:brightness-125' : ''}
            `}
            style={{
              fill: isEditMode
                ? '#1e293b'
                : (isActiveLine ? lineColor : '#334155'), // Inactive lines are grey
              fillOpacity: isEditMode ? 1 : (isActiveLine ? 1 : 0.8),
              stroke: isEditMode ? lineColor : '#020617',
              strokeDasharray: isEditMode ? '4 2' : 'none'
            }}
          />

          {/* Label */}
          <text
            x={x}
            y={isActiveLine && !isEditMode ? y - 8 : y}
            className={`
              pointer-events-none text-[22px] font-black select-none transition-all
              ${(isActiveLine && !isEditMode) || isEditMode ? 'fill-white' : 'fill-slate-400 group-hover:fill-slate-200'}
            `}
            textAnchor="middle"
            dominantBaseline="middle"
            style={(isActiveLine && !isEditMode) ? { textShadow: `0 0 15px ${lineColor}` } : {}}
          >
            {lineNames[line]}
          </text>

          {/* EDIT ICON */}
          {isEditMode && (
            <g transform={`translate(${x}, ${y + 20})`}>
              <circle r={12} fill={lineColor} />
              <Pencil size={12} className="text-slate-950 -ml-[6px] -mt-[6px]" />
            </g>
          )}

          {/* "Running" Indicator (Only when NOT editing) */}
          {!isEditMode && isRunning && !isActiveLine && (
            <g transform={`translate(${x}, ${y + 22})`}>
              <circle r={6} fill={lineColor} className="animate-pulse" stroke="#fff" strokeWidth="2" />
            </g>
          )}

          {/* Active Line Status Text */}
          {!isEditMode && isActiveLine && (
            <text
              x={x}
              y={y + 16}
              className="pointer-events-none text-[12px] fill-white/90 font-bold tracking-widest uppercase"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {isRunning ? '稼働中' : '選択中'}
            </text>
          )}
        </g>
      );
    });
  }, [lineNames, onLineClick, offset, currentLine, activeSessions, isEditMode, expandedTask]);

  // Close expanded on outside click
  const handleContainerClick = () => {
    if (expandedTask) setExpandedTask(null);
  };

  // Center Button Color logic
  const centerColor = isTracking
    ? (TASK_COLORS[currentTask.split(' > ')[0]] || currentColor)
    : currentColor;

  return (
    <div
      className="relative w-[1000px] h-[1000px] z-10 mx-auto no-select flex items-center justify-center"
      onClick={handleContainerClick}
      onMouseLeave={() => { if (expandedTask) setExpandedTask(null); }}
    >
      {/* Background Decor */}
      <div className={`absolute inset-0 rounded-full border transition-all duration-500 ${isEditMode ? 'border-dashed border-blue-500/30 scale-105' : 'border-slate-800/50 scale-95'}`}></div>
      <div className={`absolute inset-0 rounded-full border border-slate-800/30 scale-110 pointer-events-none ${isEditMode ? '' : 'border-dashed animate-[spin_60s_linear_infinite]'}`}></div>

      {/* SVG Container */}
      <svg
        className={`absolute w-[1000px] h-[1000px] -m-[25px] overflow-visible drop-shadow-[0_0_15px_rgba(0,0,0,0.5)] transition-all duration-300 ${isEditMode ? 'scale-95' : ''}`}
        viewBox="-500 -500 1000 1000"
        onClick={(e) => e.stopPropagation()}
      >
        <g>{taskSegments}</g>
        <g className="origin-center">{lineSegments}</g>
        {subCategorySegments}

        {/* Rotating Outer Ring (Active State - Satellite Orbit) */}
        {!isEditMode && isTracking && (
          <g style={{ opacity: 1 }}>
            {/* Native SVG Animation to ensure rotation around 0,0 */}
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0 0 0"
              to="360 0 0"
              dur="3s"
              repeatCount="indefinite"
            />

            {/* Orbit Track (Faint) */}
            <circle
              r={EXPANDED_LINE_OUTER_R + 10}
              fill="none"
              stroke={centerColor}
              strokeWidth="1"
              strokeOpacity="0.2"
            />

            {/* Satellite Body (The "Comet") */}
            <g transform={`translate(${EXPANDED_LINE_OUTER_R + 10}, 0)`}>
              {/* Head */}
              <circle r={6} fill="#fff" className="drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
              {/* Colored Glow */}
              <circle r={12} fill={centerColor} fillOpacity="0.5" className="blur-[4px]" />
            </g>
          </g>
        )}
      </svg>

      {/* Center FAB */}
      <div className="absolute z-20">
        <button
          id="fab"
          onClick={onCenterClick}
          className={`
            relative group
            w-[192px] h-[192px] rounded-full
            flex items-center justify-center
            text-white
            transition-all duration-200 transform
            overflow-hidden
            ${isEditMode
              ? 'bg-slate-800 hover:bg-slate-700 border-4 border-slate-600'
              : 'active:scale-95'
            }
          `}
          style={!isEditMode ? {
            boxShadow: isTracking
              ? `0 0 40px ${centerColor}60, inset 0 0 20px rgba(0,0,0,0.5)`
              : `0 0 0 6px ${currentColor}, inset 0 0 20px rgba(0,0,0,0.8)`
          } : {}}
        >
          <div className={`absolute inset-0 bg-slate-900 ${isEditMode ? 'opacity-100' : ''}`}></div>

          {/* Standard Mode Content */}
          {!isEditMode && (
            <>
              {isTracking && (
                <div
                  className="absolute inset-0 opacity-30 animate-[spin_4s_linear_infinite]"
                  style={{ background: `conic-gradient(from 0deg, transparent 0%, ${centerColor} 50%, transparent 100%)` }}
                ></div>
              )}
              <div className="relative z-10 flex flex-col items-center justify-center">
                <div
                  className="px-3 py-1 rounded text-[14px] font-bold tracking-[0.1em] mb-1"
                  style={{ backgroundColor: isTracking ? centerColor : '#334155', color: isTracking ? '#fff' : '#94a3b8' }}
                >
                  {isTracking ? '記録中' : '停止中'}
                </div>
                <span className="text-3xl font-black text-center leading-none tracking-tight drop-shadow-md mt-1 max-w-[140px] truncate">
                  {isTracking ? currentTask.split(' > ')[0] : '開始'}
                </span>
                {!isTracking && (
                  <span className="text-[14px] text-slate-400 mt-2 font-bold tracking-wide">
                    タスクを選択
                  </span>
                )}
                {isTracking && <Activity className="w-8 h-8 mt-2 animate-pulse text-white" />}
              </div>
            </>
          )}

          {/* Edit Mode Content */}
          {isEditMode && (
            <div className="relative z-10 flex flex-col items-center justify-center text-slate-300">
              <span className="text-xl font-black mb-1">編集終了</span>
              <span className="text-[12px] uppercase tracking-wider text-slate-500">Close Settings</span>
            </div>
          )}

          <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/10 to-transparent pointer-events-none"></div>
        </button>
      </div>
    </div>
  );
};

export default Wheel;