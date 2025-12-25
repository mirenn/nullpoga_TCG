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
      <img
        src={card.imageUrl}
        alt={card.cardName}
        className="monster-image"
        draggable="false"
      />
      <h3>{card.cardName}</h3>
      <p>
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
