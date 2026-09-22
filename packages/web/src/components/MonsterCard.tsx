import * as GameModels from '../types/gameModels';
import { useState } from 'react';
import { useGameStore } from '../store/gameStore';

interface MonsterCardProps {
  card: GameModels.MonsterCard;
  onDragStart: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  draggable: boolean;
  canAttack: boolean;
  onAttack: (e: React.MouseEvent<HTMLButtonElement>) => void; // 追加
}

const getCardFallbackEmoji = (cardName: string): string => {
  if (cardName.includes('ネズミ')) return '🐭';
  if (cardName.includes('柴犬') || cardName.includes('犬')) return '🐕';
  if (cardName.includes('ネコ') || cardName.includes('猫')) return '🐱';
  if (cardName.includes('カエル')) return '🐸';
  if (cardName.includes('亀')) return '🐢';
  if (cardName.includes('クラゲ')) return '🪼';
  if (cardName.includes('イノシシ')) return '🐗';
  if (cardName.includes('ドラゴン')) return '🐉';
  if (cardName.includes('ウルヴァン') || cardName.includes('狼')) return '🐺';
  return '👾';
};

const MonsterCard = ({
  card,
  onDragStart,
  onDragEnd,
  draggable,
  canAttack,
  onAttack, // 追加
}: MonsterCardProps) => {
  const activityPhaseActions = useGameStore((s) => s.activityPhaseActions);
  const [imageError, setImageError] = useState(false);
  const activityIndex = activityPhaseActions.findIndex(
    (action) => action.actionData?.monsterCard?.uniqId === card.uniqId,
  );

  const hasValidImage = !!card.imageUrl && !imageError;

  return (
    <div
      className="card monster-card"
      id={`${card.uniqId}`} 
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '2px 4px' }}>
        <h3
          title={card.cardName}
          style={{
            margin: 0,
            fontSize: '11px',
            fontWeight: 800,
            color: '#0f172a',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '46px',
            letterSpacing: '-0.3px',
          }}
        >
          {card.cardName}
        </h3>
        <span
          className="card-cost"
          style={{
            backgroundColor: '#2563eb',
            color: '#ffffff',
            borderRadius: '10px',
            padding: '1px 5px',
            fontSize: '10px',
            fontWeight: 800,
            flexShrink: 0,
          }}
        >
          {card.manaCost}マナ
        </span>
      </div>
      {hasValidImage ? (
        <img
          src={card.imageUrl!}
          alt={card.cardName}
          className="monster-image"
          draggable="false"
          onError={() => setImageError(true)}
        />
      ) : (
        <div className="monster-placeholder-icon">
          {getCardFallbackEmoji(card.cardName || '')}
        </div>
      )}
      <div
        className="monster-card-stats"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
          padding: '2px 4px',
          margin: '2px 0 0 0',
          backgroundColor: '#f8fafc',
          borderRadius: '4px',
          border: '1px solid #cbd5e1',
          fontSize: '9.5px',
          fontWeight: 800,
          lineHeight: '1.2',
          boxSizing: 'border-box',
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{ color: '#b91c1c', letterSpacing: '-0.3px' }}>ATK {card.attack}</span>
        <span style={{ color: '#15803d', letterSpacing: '-0.3px' }}>Life {card.life}</span>
      </div>
      {canAttack && (
        <button
          className="attack-button"
          onClick={(e) => onAttack(e)}
          disabled={!card.canAct}
        >
          {card.canAct ? '攻撃宣言' : '攻撃済み' + (activityIndex >= 0 ? ` #${activityIndex + 1}` : '')}
        </button>
      )}
    </div>
  );
};

export default MonsterCard;
