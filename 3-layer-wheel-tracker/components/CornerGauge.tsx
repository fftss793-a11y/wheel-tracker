import React from 'react';

interface CornerGaugeProps {
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    color: string;
    label?: string;
    value?: string;
    subValue?: string;
    icon?: React.ReactNode;
    progress?: number; // 0 to 1
    onClick?: () => void;
    className?: string;
}

const CornerGauge: React.FC<CornerGaugeProps> = ({
    position,
    color,
    label,
    value,
    subValue,
    icon,
    progress = 1,
    onClick,
    className = ''
}) => {
    // SVG Configuration
    const size = 200; // Viewport size
    const strokeWidth = 14;
    const radius = 160; // Arc radius (large enough to hug corner)
    const centerOffset = 20; // Offset from the absolute corner

    // Determine angles based on position (in degrees)
    // 0 degrees is 3 o'clock. clockwise.
    let startAngle = 0;
    let endAngle = 90;

    // Arc length in degrees (e.g., 90 degrees for a full corner)
    const arcSpan = 80; // slightly less than 90 for gaps

    // Adjust angles for each corner to create the "hug" effect
    // Top-Right: Top (270) to Right (0/360) -> 270 to 360? No, let's use standard unit circle
    // We want the arc to be "concave" relative to the center of screen?
    // No, convex. Like a bezel.
    // Actually, for "Apple Watch corners", the gauge is usually an arc *inside* the corner.
    // Let's assume the SVG is rooted at the corner: (0,0) for TL, (W,0) for TR, etc.

    // Implementation Strategy:
    // Use a fixed SVG of 200x200.
    // For Top-Left: Center is at (200, 200). Arc from ~Bottom (180deg) to ~Right (90deg)?? 
    // Wait, if it's Top-Left corner of screen, the center of the arc should be roughly "inside" the screen or "outside"?
    // Apple Watch gauges are "outside looking in" or "inside looking out".
    // Let's go with: The screen corner is the circle center? No, that pushes it out.
    // The circle center is *inset* from the corner. 
    // Top-Left Gauge: Center (X,Y). Arc goes from top edge to left edge.

    // Let's simplify: Standardize on a "Quadrant" logic.
    // The SVG will act as the corner quadrant.

    const cx = position.includes('right') ? 0 : size;
    const cy = position.includes('bottom') ? 0 : size;

    // Radius needs to be smaller than size to fit.
    // r = 160.
    // Top-Left (position='top-left'): Placed at absolute top-left.
    // We want the curved bar to be visible in the bottom-right of this SVG.
    // Center of circle: (0,0) of the SVG? No.
    // If Center is (0,0) (The corner tip), the arc at r=160 would be convex 
    // enclosing the corner content. This matches Apple Watch "Complications".
    // Correct. The gauge "fences in" the corner content.

    // Coordinates for Center of Arc (The Corner Tip)
    const arcCx = position.includes('right') ? size : 0;
    const arcCy = position.includes('bottom') ? size : 0;

    // Angles (Standard SVG angles: 0=Right, 90=Down, 180=Left, 270=Up)
    // Top-Left (Arc in Bottom-Right of SVG): Start 0 (Right) to 90 (Down)? 
    // We want it to span from "near top edge" to "near left edge".
    // Top Edge is -90? No, 270. Left Edge is 180.
    // Wait, if center is TL corner (0,0):
    // Arc should go from angle 0 (Right, along top edge?) ... to 90 (Down, along left edge)?
    // Actually standard math:
    // TL Corner: (0,0). Positive Y is down.
    // Angle 0 is (r, 0) -> Right.  Angle 90 is (0, r) -> Down.
    // So arc 0 to 90 covers the space "inside" the screen. Perfect.

    let aStart = 0; let aEnd = 90;
    if (position === 'top-left') { aStart = 5; aEnd = 85; } // 0 to 90
    if (position === 'top-right') {
        // Corner is TR (Width, 0). Center is (size, 0).
        // Angle 90 is (size, r) -> Down.
        // Angle 180 is (size-r, 0) -> Left.
        aStart = 95; aEnd = 175;
    }
    if (position === 'bottom-right') {
        // Corner is BR (Width, Height). Center is (size, size).
        // Angle 180 is Left.
        // Angle 270 is Up.
        aStart = 185; aEnd = 265;
    }
    if (position === 'bottom-left') {
        // Corner is BL (0, Height). Center is (0, size).
        // Angle 270 is Up.
        // Angle 360/0 is Right.
        aStart = 275; aEnd = 355;
    }

    // Calculate Path
    const radian = (deg: number) => (deg - 90) * (Math.PI / 180); // Adjusting for typical svg arc logic if needed?
    // Let's stick to standard cos/sin with center.
    const toRad = (d: number) => d * Math.PI / 180;

    const describeArc = (x: number, y: number, r: number, start: number, end: number) => {
        const startRad = toRad(end); // SVG path arc draws from Start point to End point. 
        const endRad = toRad(start); // We want "fill" direction usually clockwise?
        // Actually let's just calc points.

        const x1 = x + r * Math.cos(startRad);
        const y1 = y + r * Math.sin(startRad);
        const x2 = x + r * Math.cos(endRad);
        const y2 = y + r * Math.sin(endRad);

        const d = [
            "M", x, y, // Move to corner (for sector shape? No just stroke)
            "M", x1, y1,
            "A", r, r, 0, 0, 0, x2, y2 // 0 0 0 for short inner arc
        ].join(" ");

        // Simplify: Just the arc stroke
        return `M ${x + r * Math.cos(toRad(start))} ${y + r * Math.sin(toRad(start))} A ${r} ${r} 0 0 1 ${x + r * Math.cos(toRad(end))} ${y + r * Math.sin(toRad(end))}`;
    };

    const pathBg = describeArc(arcCx, arcCy, radius, aStart, aEnd);

    // Progress Arc
    const progressSpan = (aEnd - aStart) * Math.min(Math.max(progress, 0), 1);
    const pathProgress = describeArc(arcCx, arcCy, radius, aStart, aStart + progressSpan);

    // Content Styles
    const baseClasses = "absolute flex z-40 pointer-events-auto cursor-pointer transition-transform hover:scale-105 active:scale-95 select-none";
    const posClasses = {
        'top-left': 'top-0 left-0 items-start justify-start pl-4 pt-4',
        'top-right': 'top-0 right-0 items-start justify-end pr-4 pt-4 text-right',
        'bottom-left': 'bottom-0 left-0 items-end justify-start pl-4 pb-4',
        'bottom-right': 'bottom-0 right-0 items-end justify-end pr-4 pb-4 text-right',
    };

    return (
        <div className={`${baseClasses} ${posClasses[position]} ${className}`} onClick={onClick}>
            {/* SVG Background Layer */}
            <svg width={size} height={size} className="absolute inset-0 pointer-events-none overflow-visible">
                {/* Track */}
                <path d={pathBg} fill="none" stroke="#1e293b" strokeWidth={strokeWidth} strokeLinecap="round" />
                {/* Progress */}
                <path d={pathProgress} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" className="drop-shadow-[0_0_8px_rgba(0,0,0,0.8)]" />
            </svg>

            {/* Content Container (Offset to avoid being under the arc) */}
            <div
                className={`relative z-10 flex flex-col ${position.includes('bottom') ? 'mb-12' : 'mt-12'} ${position.includes('right') ? 'mr-12' : 'ml-12'}`}
                style={{ color: 'white' }}
            >
                {label && <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">{label}</span>}
                <div className="flex items-center gap-2">
                    {icon && <span className="text-slate-200">{icon}</span>}
                    {value && <span className="text-2xl font-black tracking-tight leading-none" style={{ color: color }}>{value}</span>}
                </div>
                {subValue && <span className="text-xs font-mono text-slate-500 mt-1">{subValue}</span>}
            </div>
        </div>
    );
};

export default CornerGauge;
