import React from 'react';
import * as GameModels from '../types/gameModels';

interface SpellCardProps {
  card: GameModels.SpellCard;
  onDragStart: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  draggable: boolean;
  canCast: boolean;
  onCast: () => void;
}

const getSpellFallbackEmoji = (cardName: string): string => {
  if (cardName.includes('隕石')) return '☄️';
  if (cardName.includes('岩')) return '🪨';
  if (cardName.includes('前後') || cardName.includes('交換')) return '🔄';
  if (cardName.includes('守護')) return '🛡️';
  if (cardName.includes('儀式')) return '📜';
  if (cardName.includes('烈火')) return '🔥';
  if (cardName.includes('雨')) return '🌧️';
  return '✨';
};

const SpellCard: React.FC<SpellCardProps> = ({
  card,
  onDragStart,
  onDragEnd,
  draggable,
  canCast,
  onCast,
}) => {
  return (
    <div
      className="card spell-card"
      id={card.uniqId}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      title={`${card.cardName} (${card.manaCost}マナ): ${card.effect || ''}`}
    >
      <div
        className="card-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
          padding: '1px 2px',
        }}
      >
        <h3
          title={card.cardName}
          style={{
            margin: 0,
            fontSize: '10px',
            fontWeight: 800,
            color: '#581c87',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '46px',
            letterSpacing: '-0.2px',
          }}
        >
          {card.cardName}
        </h3>
        <span
          className="card-cost spell-cost"
          style={{
            backgroundColor: '#7c3aed',
            color: '#ffffff',
            borderRadius: '8px',
            padding: '1px 4px',
            fontSize: '9.5px',
            fontWeight: 800,
            flexShrink: 0,
            boxShadow: '0 1px 2px rgba(124, 58, 237, 0.3)',
          }}
        >
          {card.manaCost}
        </span>
      </div>

      <div
        className="spell-placeholder-icon"
        style={{
          fontSize: '24px',
          lineHeight: '1',
          margin: '2px 0',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {getSpellFallbackEmoji(card.cardName || '')}
      </div>

      <div
        style={{
          fontSize: '7.5px',
          color: '#475569',
          lineHeight: '1.15',
          textAlign: 'center',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          padding: '0 2px',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        {card.effect || '呪文を発動'}
      </div>

      {canCast && (
        <button
          type="button"
          className="spell-cast-btn"
          onClick={(e) => {
            e.stopPropagation();
            onCast();
          }}
          title="呪文を発動"
        >
          発動
        </button>
      )}
    </div>
  );
};

export default SpellCard;
