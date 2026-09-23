import React from 'react';
import * as GameModels from '../types/gameModels';
import * as GameUtils from '../utils/gameUtils';
import MonsterCard from './MonsterCard';
import SpellCard from './SpellCard';
import { useGameStore } from '../store/gameStore';
import { ArcherElement } from 'react-archer';

interface HandProps {
  myUserId: string;
  onDragStart: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  isAnimating?: boolean;
  isGameOver?: boolean;
  flyingCardUniqId?: string | null;
  flyingCardUniqIds?: string[];
  drawnCardIds?: string[];
}

const Hand = ({
  myUserId,
  onDragStart,
  onDragEnd,
  isAnimating,
  isGameOver = false,
  flyingCardUniqId,
  flyingCardUniqIds,
  drawnCardIds = [],
}: HandProps) => {
  const extractedGameResponse = useGameStore((s) => s.extractedGameResponse);
  const setExtractedGameResponse = useGameStore((s) => s.setExtractedGameResponse);
  const spellPhaseActions = useGameStore((s) => s.spellPhaseActions);
  const setSpellPhaseActions = useGameStore((s) => s.setSpellPhaseActions);
  
  try {
    const gameState = extractedGameResponse?.gameRoom?.gameState;
    const player = GameUtils.getPlayerByUserId(gameState, myUserId);
    if (!player) return null;
    
    // アニメーション再生中はサーバーの各ステップの状態 (handCards) を参照し、計画中は planHandCards を参照
    const myHandCds = isAnimating
      ? (player.handCards || player.planHandCards || [])
      : (player.planHandCards || player.handCards || []);

    const currentPlanMana = player.planMana !== undefined ? player.planMana : (player.mana ?? 0);

    return (
      <div className="hand" id="player-hand">
        {myHandCds.map((card, index) => {
          const isDrawn = Boolean(drawnCardIds?.includes(card.uniqId));

          if (card.cardType === GameModels.CardType.MONSTER) {
            const canAfford = card.manaCost <= currentPlanMana;
            const isFlyingThis = (flyingCardUniqId && flyingCardUniqId === card.uniqId) || Boolean(flyingCardUniqIds?.includes(card.uniqId));
            let summon_standby_field_idx = undefined;
            const action = GameUtils.getRenderActionByUserId(gameState, myUserId);
            if (
              !isAnimating &&
              action?.actionType === GameModels.ActionType.SUMMON_MONSTER &&
              action.actionData?.monsterCard?.uniqId === card.uniqId
            ) {
              summon_standby_field_idx =
                action.actionData?.summonStandbyFieldIdx;
            }
            return (
              <ArcherElement
                key={card.uniqId || `hand-card-${index}`}
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
                <div
                  id={`player-hand-card-${card.uniqId}`}
                  className={isDrawn ? 'card-drawn-highlight' : ''}
                  style={{
                    position: 'relative',
                    opacity: isFlyingThis ? 0 : canAfford && !isGameOver ? 1 : 0.45,
                    cursor: canAfford && !isAnimating && !isGameOver ? 'grab' : 'not-allowed',
                    transition: 'opacity 0.2s ease, transform 0.2s ease',
                    flexShrink: 0,
                    borderRadius: '8px',
                  }}
                >
                  {isDrawn && <span className="new-card-badge">NEW</span>}
                  <MonsterCard
                    card={card}
                    onDragStart={canAfford && !isAnimating && !isGameOver ? onDragStart : (e) => e.preventDefault()}
                    onDragEnd={onDragEnd}
                    draggable={canAfford && !isAnimating && !isGameOver}
                    canAttack={false}
                    onAttack={() => {}}
                  />
                </div>
              </ArcherElement>
            );
          }
          if (card.cardType === GameModels.CardType.SPELL) {
            const canAfford = card.manaCost <= currentPlanMana;
            const isFlyingThis = (flyingCardUniqId && flyingCardUniqId === card.uniqId) || Boolean(flyingCardUniqIds?.includes(card.uniqId));
            return (
              <ArcherElement
                key={card.uniqId || `hand-card-${index}`}
                id={`hand-card-${index}`}
                relations={[]}
              >
                <div
                  id={`player-hand-card-${card.uniqId}`}
                  className={isDrawn ? 'card-drawn-highlight' : ''}
                  style={{
                    position: 'relative',
                    opacity: isFlyingThis ? 0 : canAfford && !isGameOver ? 1 : 0.45,
                    cursor: canAfford && !isAnimating && !isGameOver ? 'grab' : 'not-allowed',
                    transition: 'opacity 0.2s ease, transform 0.2s ease',
                    flexShrink: 0,
                    borderRadius: '8px',
                  }}
                >
                  {isDrawn && <span className="new-card-badge">NEW</span>}
                  <SpellCard
                    card={card as GameModels.SpellCard}
                    onDragStart={canAfford && !isAnimating && !isGameOver ? onDragStart : (e) => e.preventDefault()}
                    onDragEnd={onDragEnd}
                    draggable={canAfford && !isAnimating && !isGameOver}
                    canCast={canAfford && !isAnimating && !isGameOver}
                    onCast={() => {
                      GameUtils.planCastSpell(
                        card.uniqId,
                        myUserId,
                        extractedGameResponse,
                        setExtractedGameResponse,
                        undefined,
                        undefined,
                        spellPhaseActions,
                        setSpellPhaseActions
                      );
                    }}
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
