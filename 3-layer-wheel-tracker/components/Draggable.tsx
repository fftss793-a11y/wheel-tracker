import React, { useState, useRef, useEffect, ReactNode } from 'react';
import { Move } from 'lucide-react';
import { UIPosition } from '../types';

interface DraggableProps {
  id: string;
  children: ReactNode;
  initialPosition: UIPosition;
  isEnabled: boolean;
  onPositionChange: (id: string, position: UIPosition) => void;
  className?: string;
  bounds?: { left?: number; top?: number; right?: number; bottom?: number };
}

const Draggable: React.FC<DraggableProps> = ({
  id,
  children,
  initialPosition,
  isEnabled,
  onPositionChange,
  className = '',
  bounds
}) => {
  const [position, setPosition] = useState<UIPosition>(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [elementStart, setElementStart] = useState({ x: 0, y: 0 });
  const elementRef = useRef<HTMLDivElement>(null);

  // Update position when initialPosition changes externally
  useEffect(() => {
    setPosition(initialPosition);
  }, [initialPosition]);

  const getPositionStyle = (pos: UIPosition): React.CSSProperties => {
    const anchor = pos.anchor || 'top-left';
    const useFixed = anchor.includes('bottom') || anchor.includes('right');
    
    if (anchor === 'top-left') {
      return { position: 'fixed', top: `${pos.y}px`, left: `${pos.x}px` };
    } else if (anchor === 'top-right') {
      return { position: 'fixed', top: `${pos.y}px`, right: `${pos.x}px` };
    } else if (anchor === 'bottom-left') {
      return { position: 'fixed', bottom: `${pos.y}px`, left: `${pos.x}px` };
    } else if (anchor === 'bottom-right') {
      return { position: 'fixed', bottom: `${pos.y}px`, right: `${pos.x}px` };
    } else {
      // center
      return { 
        position: 'fixed', 
        top: '50%', 
        left: '50%', 
        transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))` 
      };
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isEnabled) return;
    // Allow clicks on child buttons to work normally
    const target = e.target as HTMLElement;
    if (target.tagName === 'BUTTON' || target.closest('button')) {
      return; // Don't start dragging if clicking a button
    }
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    
    const anchor = position.anchor || 'top-left';
    setElementStart({ x: position.x, y: position.y });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !isEnabled) return;

    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;

    const anchor = position.anchor || 'top-left';
    let newX = elementStart.x;
    let newY = elementStart.y;

    // Calculate new position based on anchor
    // For top-left and bottom-left: increase left = move right (positive deltaX)
    // For top-right and bottom-right: decrease right = move left (negative deltaX)
    if (anchor === 'top-left' || anchor === 'bottom-left') {
      newX = elementStart.x + deltaX;
    } else if (anchor === 'top-right' || anchor === 'bottom-right') {
      newX = elementStart.x - deltaX; // Right anchor: decrease right = move left
    }

    // For top-left and top-right: increase top = move down (positive deltaY)
    // For bottom-left and bottom-right: decrease bottom = move up (negative deltaY)
    if (anchor === 'top-left' || anchor === 'top-right') {
      newY = elementStart.y + deltaY;
    } else if (anchor === 'bottom-left' || anchor === 'bottom-right') {
      newY = elementStart.y - deltaY; // Bottom anchor: decrease bottom = move up
    }

    // Apply bounds if provided
    if (bounds) {
      const rect = elementRef.current?.getBoundingClientRect();
      if (rect) {
        if (bounds.left !== undefined) {
          if (anchor === 'top-left' || anchor === 'bottom-left') {
            newX = Math.max(newX, bounds.left);
          }
        }
        if (bounds.top !== undefined) {
          if (anchor === 'top-left' || anchor === 'top-right') {
            newY = Math.max(newY, bounds.top);
          }
        }
        if (bounds.right !== undefined) {
          if (anchor === 'top-right' || anchor === 'bottom-right') {
            newX = Math.max(newX, bounds.right);
          }
        }
        if (bounds.bottom !== undefined) {
          if (anchor === 'bottom-left' || anchor === 'bottom-right') {
            newY = Math.max(newY, bounds.bottom);
          }
        }
      }
    }

    const newPosition: UIPosition = {
      ...position,
      x: newX,
      y: newY
    };

    setPosition(newPosition);
    onPositionChange(id, newPosition);
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
    }
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart, elementStart, position, bounds]);

  return (
    <div
      ref={elementRef}
      style={getPositionStyle(position)}
      className={`${className} ${isEnabled ? 'cursor-move' : ''} ${isDragging ? 'z-[9999]' : ''} transition-transform ${isDragging ? 'scale-105' : ''}`}
      onMouseDown={handleMouseDown}
    >
      {isEnabled && !isDragging && (
        <div className="absolute -top-8 left-0 flex items-center gap-1 bg-blue-600/90 text-white px-2 py-1 rounded text-xs font-bold pointer-events-none whitespace-nowrap z-50 shadow-lg">
          <Move size={12} />
          ドラッグして移動
        </div>
      )}
      {children}
    </div>
  );
};

export default Draggable;

