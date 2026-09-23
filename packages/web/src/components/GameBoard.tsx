import * as GameModels from '../types/gameModels';
import * as GameUtils from '../utils/gameUtils';
import MonsterCard from './MonsterCard';
import { useGameStore } from '../store/gameStore';
import { ArcherElement } from 'react-archer';

export interface AttackInfo {
  attackerSlotId: string;
  targetSlotId: string;
  damage: number;
  isPlayerAttack: boolean;
}

export interface ActionEffect {
  attackerSlotId?: string;
  targetSlotId?: string;
  summonSlotId?: string;
  summonSlotIds?: string[];
  flyingSlotId?: string;
  flyingSlotIds?: string[];
  summonCard?: GameModels.MonsterCard | null;
  summonCards?: Record<string, GameModels.MonsterCard>;
  isPlayerAttack?: boolean;
  damage?: number;
  isLanding?: boolean;
  attacks?: AttackInfo[];
  spellEmoji?: string;
  spellSlotId?: string;
}

interface GameBoardProps {
  myUserId: string;
  isDragging: boolean;
  actionEffect?: ActionEffect | null;
  isAnimating?: boolean;
  isGameOver?: boolean;
}
const GameBoard = ({ myUserId, isDragging, actionEffect, isAnimating, isGameOver = false }: GameBoardProps) => {
  const extractedGameResponse = useGameStore((s) => s.extractedGameResponse);
  const setExtractedGameResponse = useGameStore((s) => s.setExtractedGameResponse);
  const spellPhaseActions = useGameStore((s) => s.spellPhaseActions);
  const setSpellPhaseActions = useGameStore((s) => s.setSpellPhaseActions);
  const summonPhaseActions = useGameStore((s) => s.summonPhaseActions);
  const setSummonPhaseActions = useGameStore((s) => s.setSummonPhaseActions);
  const activityPhaseActions = useGameStore((s) => s.activityPhaseActions);
  const setActivityPhaseActions = useGameStore((s) => s.setActivityPhaseActions);

  const gameState = extractedGameResponse?.gameRoom?.gameState;
  const player = GameUtils.getPlayerByUserId(gameState, myUserId);
  const opponent = GameUtils.getPlayerExcludingUserId(gameState, myUserId);

  const playerStandbyField = player?.planZone?.standbyField || [];
  const opponentStandbyField = opponent?.planZone?.standbyField || [];
  const playerBattleField = player?.planZone?.battleField || [];
  const opponentBattleField = opponent?.planZone?.battleField || [];

  const playerZone = player?.zone;
  const opponentZone = opponent?.zone;

  const isSlotFlying = (slotId?: string) => {
    if (!slotId) return false;
    return actionEffect?.flyingSlotId === slotId || Boolean(actionEffect?.flyingSlotIds?.includes(slotId));
  };

  const isSlotSummoning = (slotId?: string) => {
    if (!slotId) return false;
    return actionEffect?.summonSlotId === slotId || Boolean(actionEffect?.summonSlotIds?.includes(slotId));
  };

  const getSlotSummonCard = (slotId?: string) => {
    if (!slotId) return null;
    if (actionEffect?.summonSlotId === slotId && actionEffect.summonCard) {
      return actionEffect.summonCard;
    }
    return actionEffect?.summonCards?.[slotId] || null;
  };

  const getOpponentStandbyCard = (i: number, slotId: string) => {
    // フライト中（着地前）はスロットを空にする
    if (isSlotFlying(slotId)) {
      return null;
    }
    const summonCard = getSlotSummonCard(slotId);
    if (summonCard) {
      return summonCard;
    }
    // アニメーション再生中はサーバーのゾーンを直接参照
    if (isAnimating) {
      return opponentZone?.standbyField?.[i] || null;
    }
    return opponentStandbyField[i] || opponentZone?.standbyField?.[i] || null;
  };

  const getOpponentBattleCard = (i: number, slotId?: string) => {
    if (isSlotFlying(slotId)) {
      return null;
    }
    const summonCard = getSlotSummonCard(slotId);
    if (summonCard) {
      return summonCard;
    }
    if (isAnimating) {
      return opponentZone?.battleField?.[i]?.card || null;
    }
    return opponentBattleField[i]?.card || opponentZone?.battleField?.[i]?.card || null;
  };

  const getPlayerBattleCard = (i: number, slotId?: string) => {
    if (isSlotFlying(slotId)) {
      return null;
    }
    const summonCard = getSlotSummonCard(slotId);
    if (summonCard) {
      return summonCard;
    }
    if (isAnimating) {
      return playerZone?.battleField?.[i]?.card || null;
    }
    return playerBattleField[i]?.card || playerZone?.battleField?.[i]?.card || null;
  };

  const getPlayerStandbyCard = (i: number, slotId: string) => {
    // フライト中（着地前）はスロットを空にする
    if (isSlotFlying(slotId)) {
      return null;
    }
    const summonCard = getSlotSummonCard(slotId);
    if (summonCard) {
      return summonCard;
    }
    // アニメーション再生中はサーバーのゾーンを直接参照
    if (isAnimating) {
      return playerZone?.standbyField?.[i] || null;
    }
    return playerStandbyField[i] || playerZone?.standbyField?.[i] || null;
  };

  const handleAction = (event: React.MouseEvent<HTMLButtonElement>) => {
    const target = event.target as HTMLDivElement;
    const cardElement = target.closest('.card.monster-card') as HTMLDivElement;
    const uniq_id = cardElement.id;
    GameUtils.planAttackMonster(
      uniq_id,
      myUserId,
      extractedGameResponse,
      setExtractedGameResponse,
      activityPhaseActions,
      setActivityPhaseActions,
    );
  };

  return (
    <div className="game-board">
      {/* 相手のゾーン（最初の1行目） */}
      {/* スタンバイフィールド */}
      {[4, 3, 2, 1, 0].map((i) => {
        const slotId = `opponent-szone-${i}`;
        const isSummoning = isSlotSummoning(slotId);
        const isLanding = isSummoning && actionEffect?.isLanding;
        const card = getOpponentStandbyCard(i, slotId);
        return (
          <div
            key={slotId}
            className={`card-slot standby-field ${isLanding ? 'slot-summon-landing' : ''} ${isSummoning ? 'slot-summoning' : ''}`}
            id={slotId}
            onDragOver={(e) => {
              if (isDragging) e.preventDefault();
            }}
            onDrop={(event) => {
              event.preventDefault();
              const draggedElementId = event.dataTransfer?.getData('text');
              if (draggedElementId) {
                const isSpell = player?.planHandCards?.some(
                  (c) => c.uniqId === draggedElementId && c.cardType === GameModels.CardType.SPELL
                );
                if (isSpell) {
                  GameUtils.planCastSpell(
                    draggedElementId,
                    myUserId,
                    extractedGameResponse,
                    setExtractedGameResponse,
                    i,
                    opponent?.userId,
                    spellPhaseActions,
                    setSpellPhaseActions,
                    'STANDBY'
                  );
                }
              }
            }}
          >
            {actionEffect?.spellSlotId === slotId && actionEffect?.spellEmoji && (
              <div className="spell-effect-badge">
                {actionEffect.spellEmoji}
              </div>
            )}
            {card ? (
              <MonsterCard
                card={card as GameModels.MonsterCard}
                onDragStart={() => {}}
                onDragEnd={() => {}}
                draggable={false}
                canAttack={false}
                onAttack={() => {}}
              />
            ) : (
              <div className="empty-slot"></div>
            )}
          </div>
        );
      })}
      {/* バトルフィールド */}
      {[4, 3, 2, 1, 0].map((i) => {
        const slotId = `opponent-bzone-${i}`;
        const isAttacking = Boolean(
          actionEffect?.attacks?.some((a) => a.attackerSlotId === slotId) ||
          actionEffect?.attackerSlotId === slotId
        );
        const targetedAttacks = actionEffect?.attacks?.filter((a) => a.targetSlotId === slotId) || [];
        const isTargeted = targetedAttacks.length > 0 || actionEffect?.targetSlotId === slotId;
        const targetDamage = targetedAttacks.length > 0
          ? targetedAttacks.reduce((sum, a) => sum + a.damage, 0)
          : (actionEffect?.targetSlotId === slotId ? actionEffect?.damage : undefined);

        const isSummoning = isSlotSummoning(slotId);
        const isLanding = isSummoning && actionEffect?.isLanding;

        let effectClass = '';
        if (isAttacking && isTargeted) {
          effectClass = 'slot-clash-opponent';
        } else if (isAttacking) {
          effectClass = 'slot-attacking-opponent';
        } else if (isTargeted) {
          effectClass = 'slot-targeted';
        } else if (isLanding) {
          effectClass = 'slot-summon-landing';
        }
        const card = getOpponentBattleCard(i, slotId);

        return (
          <div
            key={slotId}
            className={`card-slot battle-field ${opponentBattleField[i]?.status === GameModels.FieldStatus.WILDERNESS ? 'wilderness' : ''} ${effectClass}`}
            id={slotId}
            onDragOver={(e) => {
              if (isDragging) e.preventDefault();
            }}
            onDrop={(event) => {
              event.preventDefault();
              const draggedElementId = event.dataTransfer?.getData('text');
              if (draggedElementId) {
                const spell = player?.planHandCards?.find(
                  (c) => c.uniqId === draggedElementId && c.cardType === GameModels.CardType.SPELL
                );
                if (spell) {
                  if (spell.cardNo === 103) {
                    // 前後交換：相手バトルゾーンを選択した場合、対面の相手モンスターを引き寄せる
                    GameUtils.planCastSpell(
                      draggedElementId,
                      myUserId,
                      extractedGameResponse,
                      setExtractedGameResponse,
                      4 - i,
                      opponent?.userId,
                      spellPhaseActions,
                      setSpellPhaseActions,
                      'OPPONENT_BATTLE'
                    );
                  } else {
                    GameUtils.planCastSpell(
                      draggedElementId,
                      myUserId,
                      extractedGameResponse,
                      setExtractedGameResponse,
                      i,
                      opponent?.userId,
                      spellPhaseActions,
                      setSpellPhaseActions,
                      'BATTLE'
                    );
                  }
                }
              }
            }}
          >
            {actionEffect?.spellSlotId === slotId && actionEffect?.spellEmoji && (
              <div className="spell-effect-badge">
                {actionEffect.spellEmoji}
              </div>
            )}
            {isAttacking && <div className="attacking-badge">⚔️ 攻撃!</div>}
            {isTargeted && targetDamage !== undefined && (
              <div className="damage-popup-overlay">💥 -{targetDamage}</div>
            )}
            {card ? (
              <MonsterCard
                card={card as GameModels.MonsterCard}
                onDragStart={() => {}}
                onDragEnd={() => {}}
                draggable={false}
                canAttack={false}
                onAttack={() => {}}
              />
            ) : (
              <div className="empty-slot"></div>
            )}
          </div>
        );
      })}
      {/* プレイヤーのバトルフィールド */}
      {[0, 1, 2, 3, 4].map((i) => {
        const slotId = `player-bzone-${i}`;
        const isAttacking = Boolean(
          actionEffect?.attacks?.some((a) => a.attackerSlotId === slotId) ||
          actionEffect?.attackerSlotId === slotId
        );
        const targetedAttacks = actionEffect?.attacks?.filter((a) => a.targetSlotId === slotId) || [];
        const isTargeted = targetedAttacks.length > 0 || actionEffect?.targetSlotId === slotId;
        const targetDamage = targetedAttacks.length > 0
          ? targetedAttacks.reduce((sum, a) => sum + a.damage, 0)
          : (actionEffect?.targetSlotId === slotId ? actionEffect?.damage : undefined);

        const isSummoning = isSlotSummoning(slotId);
        const isLanding = isSummoning && actionEffect?.isLanding;

        let effectClass = '';
        if (isAttacking && isTargeted) {
          effectClass = 'slot-clash-player';
        } else if (isAttacking) {
          effectClass = 'slot-attacking-player';
        } else if (isTargeted) {
          effectClass = 'slot-targeted';
        } else if (isLanding) {
          effectClass = 'slot-summon-landing';
        }
        const card = getPlayerBattleCard(i, slotId);

        return (
          <div
            key={slotId}
            className={`card-slot battle-field ${playerBattleField[i]?.status === GameModels.FieldStatus.WILDERNESS ? 'wilderness' : ''} ${effectClass}`}
            id={slotId}
            onDragOver={(e) => {
              if (isDragging) e.preventDefault();
            }}
            onDrop={(event) => {
              event.preventDefault();
              const draggedElementId = event.dataTransfer?.getData('text');
              if (draggedElementId) {
                const isSpell = player?.planHandCards?.some(
                  (c) => c.uniqId === draggedElementId && c.cardType === GameModels.CardType.SPELL
                );
                if (isSpell) {
                  GameUtils.planCastSpell(
                    draggedElementId,
                    myUserId,
                    extractedGameResponse,
                    setExtractedGameResponse,
                    i,
                    myUserId,
                    spellPhaseActions,
                    setSpellPhaseActions,
                    'BATTLE'
                  );
                }
              }
            }}
          >
            {actionEffect?.spellSlotId === slotId && actionEffect?.spellEmoji && (
              <div className="spell-effect-badge">
                {actionEffect.spellEmoji}
              </div>
            )}
            {isAttacking && <div className="attacking-badge">⚔️ 攻撃!</div>}
            {isTargeted && targetDamage !== undefined && (
              <div className="damage-popup-overlay">💥 -{targetDamage}</div>
            )}
            {card ? (
              <MonsterCard
                card={card as GameModels.MonsterCard}
                onDragStart={() => {}}
                onDragEnd={() => {}}
                draggable={false}
                canAttack={!isAnimating && !isGameOver}
                onAttack={handleAction}
              />
            ) : (
              <div className="empty-slot"></div>
            )}
          </div>
        );
      })}
      {/* プレイヤーのゾーン（最後の1行目） */}
      {/* スタンバイフィールド */}
      {[0, 1, 2, 3, 4].map((i) => {
        const slotId = `player-szone-${i}`;
        const isSummoning = isSlotSummoning(slotId);
        const isLanding = isSummoning && actionEffect?.isLanding;
        const card = getPlayerStandbyCard(i, slotId);

        return (
          <ArcherElement
            id={`archer-player-szone-${i}`}
            key={slotId}
          >
            <div
              key={slotId}
              className={`card-slot standby-field ${isDragging ? 'highlight' : ''} ${isLanding ? 'slot-summon-landing' : ''} ${isSummoning ? 'slot-summoning' : ''}`}
              id={slotId}
              onDragOver={(e) => {
                if (isDragging) e.preventDefault();
              }}
              onDrop={(event) => {
                event.preventDefault();
                const draggedElementId = event.dataTransfer?.getData('text');
                if (!draggedElementId) return;
                const isSpell = player?.planHandCards?.some(
                  (c) => c.uniqId === draggedElementId && c.cardType === GameModels.CardType.SPELL
                );
                if (isSpell) {
                  GameUtils.planCastSpell(
                    draggedElementId,
                    myUserId,
                    extractedGameResponse,
                    setExtractedGameResponse,
                    i,
                    myUserId,
                    spellPhaseActions,
                    setSpellPhaseActions,
                    'STANDBY'
                  );
                } else if (!card) {
                  GameUtils.planSummonMonster(
                    draggedElementId,
                    myUserId,
                    extractedGameResponse,
                    setExtractedGameResponse,
                    i,
                    summonPhaseActions,
                    setSummonPhaseActions
                  );
                }
              }}
            >
              {actionEffect?.spellSlotId === slotId && actionEffect?.spellEmoji && (
                <div className="spell-effect-badge">
                  {actionEffect.spellEmoji}
                </div>
              )}
              {card ? (
                <MonsterCard
                  card={card as GameModels.MonsterCard}
                  onDragStart={() => {}}
                  onDragEnd={() => {}}
                  draggable={false}
                  canAttack={false}
                  onAttack={() => {}}
                />
              ) : (
                <div className="empty-slot"></div>
              )}
            </div>
          </ArcherElement>
        );
      })}
    </div>
  );
};

export default GameBoard;
