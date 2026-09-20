import * as GameModels from '../types/gameModels';
import * as GameUtils from '../utils/gameUtils';
import MonsterCard from './MonsterCard';
import { GameContext } from '../context/gameContext';
import { useContext } from 'react';
import { ArcherElement } from 'react-archer';

export interface ActionEffect {
  attackerSlotId?: string;
  targetSlotId?: string;
  summonSlotId?: string;
  isPlayerAttack?: boolean;
  damage?: number;
}

interface GameBoardProps {
  myUserId: string;
  isDragging: boolean;
  actionEffect?: ActionEffect | null;
}
const GameBoard = ({ myUserId, isDragging, actionEffect }: GameBoardProps) => {
  const {
    extractedGameResponse,
    setExtractedGameResponse,
    summonPhaseActions,
    setSummonPhaseActions,
    activityPhaseActions,
    setActivityPhaseActions,
  } = useContext(GameContext);

  const gameState = extractedGameResponse?.gameRoom?.gameState;
  const player = GameUtils.getPlayerByUserId(gameState, myUserId);
  const opponent = GameUtils.getPlayerExcludingUserId(gameState, myUserId);

  const playerStandbyField = player?.planZone?.standbyField || [];
  const opponentStandbyField = opponent?.planZone?.standbyField || [];
  const playerBattleField = player?.planZone?.battleField || [];
  const opponentBattleField = opponent?.planZone?.battleField || [];

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
        return (
          <div
            key={slotId}
            className={`card-slot standby-field ${isSummoning ? 'slot-summoning' : ''}`}
            id={slotId}
          >
            {opponentStandbyField && opponentStandbyField[i] ? (
              <MonsterCard
                card={opponentStandbyField[i] as GameModels.MonsterCard}
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
            {opponentBattleField && opponentBattleField[i]?.card ? (
              <MonsterCard
                card={opponentBattleField[i].card as GameModels.MonsterCard}
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
            {playerBattleField && playerBattleField[i]?.card ? (
              <MonsterCard
                card={playerBattleField[i].card as GameModels.MonsterCard}
                onDragStart={() => {}}
                onDragEnd={() => {}}
                draggable={false}
                canAttack={true}
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

        return (
          <ArcherElement
            id={`archer-player-szone-${i}`}
            key={slotId}
          >
            <div
              key={slotId}
              className={`card-slot standby-field ${isDragging ? 'highlight' : ''} ${isSummoning ? 'slot-summoning' : ''}`}
              id={slotId}
            >
              {playerStandbyField && playerStandbyField[i] ? (
                <MonsterCard
                  card={playerStandbyField[i] as GameModels.MonsterCard}
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
