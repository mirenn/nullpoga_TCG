import React, { useContext } from 'react';
import * as GameModels from '../types/gameModels';
import * as GameUtils from '../utils/gameUtils';
import MonsterCard from './MonsterCard';
import { GameContext } from '../context/gameContext';
import { ArcherElement } from 'react-archer';

interface HandProps {
  myUserId: string;
  onDragStart: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
}

const Hand = ({ myUserId, onDragStart, onDragEnd }: HandProps) => {
  const { extractedGameResponse } = useContext(GameContext);
  console.log('Hand確認 extractedGameResponse:', extractedGameResponse);
  
  try {
    const gameState = extractedGameResponse?.gameRoom?.gameState;
    const player = GameUtils.getPlayerByUserId(gameState, myUserId);
    if (!player) return null;
    const myHandCds = player.planHandCards;

    return (
      <div className="hand" id="player-hand">
        {myHandCds.map((card, index) => {
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
                          targetId: `archer-player-szone-${summon_standby_field_idx}`,
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
  } catch (error) {
    console.error('Hand error:', error);
    return (
      <div className="hand" id="player-hand">
        <p>手札を読み込み中...</p>
      </div>
    );
  }
};

export default Hand;
