import * as GameModels from '../types/gameModels';
import { useContext } from 'react';
import { GameContext } from '../context/gameContext';

interface MonsterCardProps {
  card: GameModels.MonsterCard;
  onDragStart: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  draggable: boolean;
  canAttack: boolean;
  onAttack: (e: React.MouseEvent<HTMLButtonElement>) => void; // 追加
}

const MonsterCard = ({
  card,
  onDragStart,
  onDragEnd,
  draggable,
  canAttack,
  onAttack, // 追加
}: MonsterCardProps) => {
  const { activityPhaseActions } = useContext(GameContext);
  const activityIndex = activityPhaseActions.findIndex(
    (action) => action.actionData.monsterCard?.uniqId === card.uniqId,
  );

  return (
    <div
      className="card monster-card"
      id={`${card.uniqId}`} 
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '2px 4px' }}>
        <h3 style={{ margin: 0, fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '70px' }}>{card.cardName}</h3>
        <span className="card-cost" style={{ backgroundColor: '#0969da', color: '#fff', borderRadius: '10px', padding: '1px 5px', fontSize: '10px', fontWeight: 'bold', flexShrink: 0 }}>
          {card.manaCost}マナ
        </span>
      </div>
      <img
        src={card.imageUrl || ''}
        alt={card.cardName}
        className="monster-image"
        draggable="false"
        onError={(e) => {
          (e.target as HTMLElement).style.display = 'none';
        }}
      />
      <p style={{ margin: '2px 0', fontSize: '11px', fontWeight: 'bold' }}>
        ATK: {card.attack} Life: {card.life}
      </p>
      {canAttack && (
        <button
          className="attack-button"
          onClick={(e) => onAttack(e)}
          disabled={!card.canAct}
        >
          {card.canAct ? '攻撃宣言' : '攻撃宣言済み' + activityIndex}
        </button>
      )}
    </div>
  );
};

export default MonsterCard;
