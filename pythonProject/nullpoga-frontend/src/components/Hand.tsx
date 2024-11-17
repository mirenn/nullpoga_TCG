import React, { useContext } from 'react';
import * as GameModels from '../gameModels';
import * as GameUtils from '../gameUtils';
import MonsterCard from './MonsterCard';
import { GameContext } from '../gameContext';

interface HandProps {
  myUserId: string;
  onDragStart: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
}

const Hand = ({ myUserId, onDragStart, onDragEnd }: HandProps) => {
  const { extractedGameResponse } = useContext(GameContext);
  console.log('Hand確認 extractedGameResponse:', extractedGameResponse);

  const gameState = extractedGameResponse?.game_state;
  const myHandCds = GameUtils.getPlayerByUserId(
    gameState,
    myUserId,
  )?.plan_hand_cards;

  return (
    <div className="hand" id="player-hand">
      {myHandCds?.map((card, index) => {
        if (card.card_type === GameModels.CardType.MONSTER) {
          return (
            <MonsterCard
              key={index}
              card={card}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              draggable={true}
              canAttack={false}
              onAttack={() => {}}
            />
          );
        }
        return null;
      })}
    </div>
  );
};

export default Hand;
