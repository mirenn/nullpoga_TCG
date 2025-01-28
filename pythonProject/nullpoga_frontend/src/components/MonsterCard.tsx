import * as GameModels from '../gameModels';
import { useContext } from 'react';
import { GameContext } from '../gameContext';

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
    (action) => action.action_data.monster_card?.uniq_id === card.uniq_id,
  );

  return (
    <div
      className="card monster-card"
      id={`${card.uniq_id}`}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <img
        src={card.image_url}
        alt={card.card_name}
        className="monster-image"
        draggable="false"
      />
      <h3>{card.card_name}</h3>
      <p>
        ATK: {card.attack} Life: {card.life}
      </p>
      {canAttack && (
        <button
          className="attack-button"
          onClick={(e) => onAttack(e)}
          disabled={!card.can_act}
        >
          {card.can_act ? '攻撃宣言' : '攻撃宣言済み' + activityIndex}
        </button>
      )}
    </div>
  );
};

export default MonsterCard;
