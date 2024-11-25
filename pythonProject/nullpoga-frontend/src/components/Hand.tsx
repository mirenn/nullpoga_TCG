import React, { useContext } from 'react';
import * as GameModels from '../gameModels';
import * as GameUtils from '../gameUtils';
import MonsterCard from './MonsterCard';
import { GameContext } from '../gameContext';
import { ArcherElement } from 'react-archer';

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
  //const rootStyle = { display: 'flex', justifyContent: 'center' };

  return (
    <div className="hand" id="player-hand">
      {myHandCds?.map((card, index) => {
        if (card.card_type === GameModels.CardType.MONSTER) {
          let summon_standby_field_idx = undefined;
          const action = GameUtils.getRenderActionByUserId(gameState, myUserId);
          if (
            action?.action_type === GameModels.ActionType.SUMMON_MONSTER &&
            action.action_data.monster_card?.uniq_id === card.uniq_id
          ) {
            summon_standby_field_idx =
              action.action_data.summon_standby_field_idx;
          }
          return (
            <ArcherElement
              key={index}
              id={`hand-card-${index}`}
              relations={
                summon_standby_field_idx !== undefined
                  ? [
                      {
                        targetId: `archer-player-szone-${summon_standby_field_idx}`, //`player-szone-${summon_standby_field_idx}`,
                        targetAnchor: 'middle',
                        sourceAnchor: 'top',
                        style: { strokeColor: '#f00', strokeWidth: 1 },
                      },
                    ]
                  : []
              }
            >
              <div>
                <MonsterCard
                  card={card}
                  // key={index}
                  onDragStart={onDragStart}
                  onDragEnd={onDragEnd}
                  draggable={true}
                  canAttack={false}
                  onAttack={() => {}}
                />
              </div>
            </ArcherElement>
          );
        }
        return null;
      })}
    </div>
  );
};

export default Hand;
