'use client';

import React, { useEffect, useState } from 'react';
import * as GameModels from '../types/gameModels';
import MonsterCard from './MonsterCard';
import SpellCard from './SpellCard';

export interface FlyingCardProps {
  card?: GameModels.CardData;
  isBack?: boolean;
  startRect: { top: number; left: number; width: number; height: number };
  endRect: { top: number; left: number; width: number; height: number };
  durationMs?: number;
  glowColor?: string;
  onComplete?: () => void;
}

export const FlyingCard: React.FC<FlyingCardProps> = ({
  card,
  isBack = false,
  startRect,
  endRect,
  durationMs = 600,
  glowColor,
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

  const activeGlow = glowColor || 'rgba(0, 188, 212, 0.85)';

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
      ? `drop-shadow(0 12px 24px ${activeGlow}) brightness(1.15)`
      : 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2))',
    transformOrigin: 'top left',
  };

  const renderCardContent = () => {
    if (isBack || !card) {
      return (
        <div className="card card-back">
          <div className="card-back-pattern">
            <span className="card-back-logo">🃏</span>
          </div>
        </div>
      );
    }

    if (card.cardType === GameModels.CardType.SPELL) {
      return (
        <SpellCard
          card={card as GameModels.SpellCard}
          onDragStart={() => {}}
          onDragEnd={() => {}}
          draggable={false}
          canCast={false}
          onCast={() => {}}
        />
      );
    }

    return (
      <MonsterCard
        card={card as GameModels.MonsterCard}
        onDragStart={() => {}}
        onDragEnd={() => {}}
        draggable={false}
        canAttack={false}
        onAttack={() => {}}
      />
    );
  };

  return (
    <div style={style} className="flying-card-wrapper">
      {renderCardContent()}
    </div>
  );
};

export default FlyingCard;
