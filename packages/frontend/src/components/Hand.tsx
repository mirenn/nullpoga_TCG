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

  const gameState = extractedGameResponse?.gameRoom?.gameState;
  const myHandCds = GameUtils.getPlayerByUserId(
    gameState,
    myUserId,
  )?.planHandCards;
  //const rootStyle = { display: 'flex', justifyContent: 'center' };

  return (
    <div className="hand" id="player-hand">
      {myHandCds?.map((card, index) => {
        if (card.cardType === GameModels.CardType.MONSTER) {
          let summon_standby_field_idx = undefined;
          const action = GameUtils.getRenderActionByUserId(gameState, myUserId);
          if (
            action?.actionType === GameModels.ActionType.SUMMON_MONSTER &&
            action.actionData.monsterCard?.uniqId === card.uniqId
          ) {
            summon_standby_field_idx =
              action.actionData.summonStandbyFieldIdx;
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
                        label: 'summon',
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
