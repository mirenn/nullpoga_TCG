import * as GameModels from '../gameModels';

interface MonsterCardProps {
  card: GameModels.MonsterCard;
  onDragStart: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  draggable: boolean;
  canAttack: boolean;
}

const MonsterCard = ({
  card,
  onDragStart,
  onDragEnd,
  draggable,
  canAttack,
}: MonsterCardProps) => {
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
      <p>Attack: {card.attack}</p>
      <p>Life: {card.life}</p>
      {canAttack && <button className="attack-button">攻撃宣言</button>}
    </div>
  );
};

export default MonsterCard;
