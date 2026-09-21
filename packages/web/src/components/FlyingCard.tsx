'use client';

import React, { useEffect, useState } from 'react';
import * as GameModels from '../types/gameModels';
import MonsterCard from './MonsterCard';

export interface FlyingCardProps {
  card: GameModels.MonsterCard;
  startRect: { top: number; left: number; width: number; height: number };
  endRect: { top: number; left: number; width: number; height: number };
  durationMs?: number;
  onComplete?: () => void;
}

export const FlyingCard: React.FC<FlyingCardProps> = ({
  card,
  startRect,
  endRect,
  durationMs = 600,
  onComplete,
}) => {
  const [isFlying, setIsFlying] = useState(false);

  useEffect(() => {
    // 次のフレームで移動を開始
    const animFrame = requestAnimationFrame(() => {
      setIsFlying(true);
    });

    const timer = setTimeout(() => {
      if (onComplete) {
        onComplete();
      }
    }, durationMs);

    return () => {
      cancelAnimationFrame(animFrame);
      clearTimeout(timer);
    };
  }, [durationMs, onComplete]);

  const deltaX = endRect.left - startRect.left;
  const deltaY = endRect.top - startRect.top;
  const scale = endRect.width / Math.max(startRect.width, 1);

  const style: React.CSSProperties = {
    position: 'fixed',
    top: startRect.top,
    left: startRect.left,
    width: startRect.width,
    height: startRect.height,
    zIndex: 9999,
    pointerEvents: 'none',
    transition: isFlying
      ? `transform ${durationMs}ms cubic-bezier(0.2, 0.8, 0.25, 1), filter ${durationMs}ms ease`
      : 'none',
    transform: isFlying
      ? `translate3d(${deltaX}px, ${deltaY}px, 0) scale(${scale})`
      : 'translate3d(0, 0, 0) scale(1)',
    filter: isFlying
      ? 'drop-shadow(0 12px 24px rgba(0, 188, 212, 0.85)) brightness(1.15)'
      : 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2))',
    transformOrigin: 'top left',
  };

  return (
    <div style={style} className="flying-card-wrapper">
      <MonsterCard
        card={card}
        onDragStart={() => {}}
        onDragEnd={() => {}}
        draggable={false}
        canAttack={false}
        onAttack={() => {}}
      />
    </div>
  );
};

export default FlyingCard;
