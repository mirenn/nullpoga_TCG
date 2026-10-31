import React from 'react';
import type { DemoCard } from '../types';

interface CircleSidePanelProps {
  playerMana: number;
  maxMana: number;
  deckCount: number;
  nextCard: DemoCard | null;
  hand: DemoCard[];
  selectedCardIndex: number | null;
  draggedCardIndex: number | null;
  gameResult: string;
  checkCanPlayCard: (idx: number) => { canPlay: boolean; reason?: string };
  setSelectedCardIndex: React.Dispatch<React.SetStateAction<number | null>>;
  handleDragStart: (e: React.DragEvent, idx: number) => void;
  handleDragEnd: () => void;
  handleCardPointerDown?: (idx: number) => void;
}

export const CircleSidePanel: React.FC<CircleSidePanelProps> = ({
  playerMana,
  maxMana,
  deckCount,
  nextCard,
  hand,
  selectedCardIndex,
  draggedCardIndex,
  gameResult,
  checkCanPlayCard,
  setSelectedCardIndex,
  handleDragStart,
  handleDragEnd,
  handleCardPointerDown,
}) => {
  return (
    <div
      style={{
        width: '260px',
        height: '100%',
        maxHeight: '440px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        backgroundColor: '#0f172a',
        borderRadius: '12px',
        border: '1px solid #334155',
        padding: '12px',
        boxSizing: 'border-box',
        flexShrink: 0,
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
      }}
    >
      {/* 1. マナゲージ */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '4px' }}>
            ⚡ マナ
          </span>
          <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#f8fafc' }}>
            {playerMana.toFixed(1)} <span style={{ fontSize: '11px', color: '#94a3b8' }}>/ {maxMana}</span>
          </span>
        </div>
        <div
          style={{
            width: '100%',
            height: '14px',
            backgroundColor: '#1e293b',
            borderRadius: '7px',
            overflow: 'hidden',
            border: '1px solid #334155',
            position: 'relative',
          }}
        >
          <div
            style={{
              width: `${Math.min(100, (playerMana / maxMana) * 100)}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #2563eb, #38bdf8)',
              transition: 'width 0.1s linear',
            }}
          />
          {/* 目盛り (1〜9) */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', pointerEvents: 'none' }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((tick) => (
              <div
                key={tick}
                style={{
                  position: 'absolute',
                  left: `${(tick / 10) * 100}%`,
                  top: 0,
                  bottom: 0,
                  width: '1px',
                  backgroundColor: 'rgba(0,0,0,0.4)',
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 2. NEXT & 山札スロット */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#1e293b',
          padding: '5px 8px',
          borderRadius: '8px',
          border: '1px solid #334155',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
          <span
            style={{
              fontSize: '9px',
              fontWeight: 'bold',
              backgroundColor: '#2563eb',
              color: '#fff',
              padding: '1px 5px',
              borderRadius: '4px',
            }}
          >
            NEXT
          </span>
          {nextCard ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', overflow: 'hidden' }}>
              <span style={{ fontSize: '15px' }}>{nextCard.icon}</span>
              <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '90px' }}>
                {nextCard.name}
              </span>
              <span style={{ fontSize: '10px', color: '#38bdf8', fontWeight: 'bold' }}>
                ⚡{nextCard.manaCost}
              </span>
            </div>
          ) : (
            <span style={{ fontSize: '11px', color: '#64748b' }}>山札切れ</span>
          )}
        </div>
        <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'bold', whiteSpace: 'nowrap', marginLeft: '6px' }}>
          🎴{deckCount}/15
        </div>
      </div>

      {/* 3. 手札カードグリッド (2列 x 2行) */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gridTemplateRows: 'repeat(2, 1fr)',
          gap: '8px',
          minHeight: 0,
        }}
      >
        {hand.map((card, idx) => {
          const isSelected = selectedCardIndex === idx;
          const isBeingDragged = draggedCardIndex === idx;
          const validation = checkCanPlayCard(idx);
          const canPlay = validation.canPlay;

          return (
            <div
              key={`hand_slot_${idx}`}
              draggable={canPlay && gameResult === 'playing'}
              onDragStart={(e) => handleDragStart(e, idx)}
              onDragEnd={handleDragEnd}
              onPointerDown={() => {
                if (handleCardPointerDown) {
                  handleCardPointerDown(idx);
                } else {
                  setSelectedCardIndex(isSelected ? null : idx);
                }
              }}
              onClick={() => {
                setSelectedCardIndex((prev) => (prev === idx ? null : idx));
              }}
              title={canPlay ? `${card.name} (配置またはクリックで指定)` : validation.reason}
              style={{
                backgroundColor: isSelected ? '#1e3a8a' : '#1e293b',
                borderRadius: '8px',
                border: isSelected ? '2px solid #3b82f6' : '1.5px solid #334155',
                padding: '6px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                cursor: canPlay ? (isBeingDragged ? 'grabbing' : 'pointer') : 'not-allowed',
                opacity: isBeingDragged ? 0.35 : canPlay ? 1 : 0.45,
                transform: isBeingDragged ? 'scale(0.95)' : isSelected ? 'scale(1.02)' : 'none',
                boxShadow: isSelected ? '0 0 12px rgba(59, 130, 246, 0.6)' : 'none',
                transition: 'all 0.15s ease',
                userSelect: 'none',
                boxSizing: 'border-box',
                overflow: 'hidden',
              }}
            >
              {/* カード上部：コスト & キー番号 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 'bold',
                    backgroundColor: '#1d4ed8',
                    color: '#fff',
                    padding: '1px 5px',
                    borderRadius: '3px',
                  }}
                >
                  ⚡{card.manaCost}
                </span>
                <span style={{ fontSize: '9px', color: '#94a3b8', backgroundColor: '#0f172a', padding: '1px 4px', borderRadius: '3px' }}>
                  [{idx + 1}]
                </span>
              </div>

              {/* カード中央：アイコン & 名前 */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', margin: '2px 0' }}>
                <span style={{ fontSize: '26px', lineHeight: 1 }}>{card.icon}</span>
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 'bold',
                    color: '#f8fafc',
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    width: '100%',
                  }}
                >
                  {card.name}
                </div>
              </div>

              {/* カード下部：攻・HP・速 */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-around',
                  alignItems: 'center',
                  fontSize: '9px',
                  backgroundColor: 'rgba(0, 0, 0, 0.35)',
                  padding: '2px 4px',
                  borderRadius: '4px',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
              >
                <span title="攻撃力" style={{ color: '#f87171', fontWeight: 'bold' }}>
                  ⚔️{card.attack}
                </span>
                <span title="HP" style={{ color: '#4ade80', fontWeight: 'bold' }}>
                  ❤️{card.life}
                </span>
                <span title="移動速度" style={{ color: '#38bdf8', fontWeight: 'bold' }}>
                  🏃{card.speed}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
