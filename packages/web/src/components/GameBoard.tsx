import * as GameModels from '../types/gameModels';
import * as GameUtils from '../utils/gameUtils';
import MonsterCard from './MonsterCard';
import { useGameStore } from '../store/gameStore';
import { ArcherElement } from 'react-archer';

export interface ActionEffect {
  attackerSlotId?: string;
  targetSlotId?: string;
  summonSlotId?: string;
  flyingSlotId?: string;
  summonCard?: GameModels.MonsterCard | null;
  isPlayerAttack?: boolean;
  damage?: number;
  isLanding?: boolean;
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

  const getOpponentStandbyCard = (i: number, slotId: string) => {
    // フライト中（着地前）はスロットを空にする
    if (actionEffect?.flyingSlotId === slotId) {
      return null;
    }
    if (actionEffect?.summonSlotId === slotId && actionEffect.summonCard) {
      return actionEffect.summonCard;
    }
    // アニメーション再生中はサーバーのゾーンを直接参照
    if (isAnimating) {
      return opponentZone?.standbyField?.[i] || null;
    }
    return opponentStandbyField[i] || opponentZone?.standbyField?.[i] || null;
  };

  const getOpponentBattleCard = (i: number) => {
    if (isAnimating) {
      return opponentZone?.battleField?.[i]?.card || null;
    }
    return opponentBattleField[i]?.card || opponentZone?.battleField?.[i]?.card || null;
  };

  const getPlayerBattleCard = (i: number) => {
    if (isAnimating) {
      return playerZone?.battleField?.[i]?.card || null;
    }
    return playerBattleField[i]?.card || playerZone?.battleField?.[i]?.card || null;
  };

  const getPlayerStandbyCard = (i: number, slotId: string) => {
    // フライト中（着地前）はスロットを空にする
    if (actionEffect?.flyingSlotId === slotId) {
      return null;
    }
    if (actionEffect?.summonSlotId === slotId && actionEffect.summonCard) {
      return actionEffect.summonCard;
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
        const isSummoning = actionEffect?.summonSlotId === slotId;
        const isLanding = isSummoning && actionEffect?.isLanding;
        const card = getOpponentStandbyCard(i, slotId);
        return (
          <div
            key={slotId}
            className={`card-slot standby-field ${isLanding ? 'slot-summon-landing' : ''} ${isSummoning ? 'slot-summoning' : ''}`}
            id={slotId}
          >
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
        const isAttacking = actionEffect?.attackerSlotId === slotId;
        const isTargeted = actionEffect?.targetSlotId === slotId;
        const effectClass = isAttacking ? 'slot-attacking-opponent' : isTargeted ? 'slot-targeted' : '';
        const card = getOpponentBattleCard(i);

        return (
          <div
            key={slotId}
            className={`card-slot battle-field ${opponentBattleField[i]?.status === GameModels.FieldStatus.WILDERNESS ? 'wilderness' : ''} ${effectClass}`}
            id={slotId}
          >
            {isAttacking && <div className="attacking-badge">⚔️ 攻撃!</div>}
            {isTargeted && actionEffect?.damage !== undefined && (
              <div className="damage-popup-overlay">💥 -{actionEffect.damage}</div>
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
        const isAttacking = actionEffect?.attackerSlotId === slotId;
        const isTargeted = actionEffect?.targetSlotId === slotId;
        const effectClass = isAttacking ? 'slot-attacking-player' : isTargeted ? 'slot-targeted' : '';
        const card = getPlayerBattleCard(i);

        return (
          <div
            key={slotId}
            className={`card-slot battle-field ${playerBattleField[i]?.status === GameModels.FieldStatus.WILDERNESS ? 'wilderness' : ''} ${effectClass}`}
            id={slotId}
          >
            {isAttacking && <div className="attacking-badge">⚔️ 攻撃!</div>}
            {isTargeted && actionEffect?.damage !== undefined && (
              <div className="damage-popup-overlay">💥 -{actionEffect.damage}</div>
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
        const isSummoning = actionEffect?.summonSlotId === slotId;
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
            >
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
                <div
                  className="empty-slot"
                  onDrop={(event) => {
                    event.preventDefault();
                    const dropAreaId = (event.target as HTMLElement).closest(
                      '.card-slot',
                    )?.id;
                    const draggedElementId = event.dataTransfer!.getData('text');
                    const draggedElement =
                      document.getElementById(draggedElementId);
                    if (draggedElement && dropAreaId) {
                      const match = dropAreaId.match(/\d+$/);
                      if (match) {
                        const summonIndex = match[0];
                        GameUtils.planSummonMonster(
                          draggedElementId,
                          myUserId,
                          extractedGameResponse,
                          setExtractedGameResponse,
                          Number(summonIndex),
                          summonPhaseActions,
                          setSummonPhaseActions,
                        );
                      }
                    }
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                  }}
                ></div>
              )}
            </div>
          </ArcherElement>
        );
      })}
    </div>
  );
};

export default GameBoard;
