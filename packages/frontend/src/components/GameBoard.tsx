import * as GameModels from '../gameModels';
import * as GameUtils from '../gameUtils.js';
import MonsterCard from './MonsterCard.js';
import { GameContext } from '../gameContext.js';
import { useContext } from 'react';
import { ArcherElement } from 'react-archer';

interface GameBoardProps {
  myUserId: string;
  isDragging: boolean;
}
const GameBoard = ({ myUserId, isDragging }: GameBoardProps) => {
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
      {[4, 3, 2, 1, 0].map((i) => (
        <div
          key={`opponent-szone-${i}`}
          className="card-slot standby-field"
          id={`opponent-szone-${i}`}
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
      ))}
      {/* バトルフィールド */}
      {[4, 3, 2, 1, 0].map((i) => (
        <div
          key={`opponent-bzone-${i}`}
          className={`card-slot battle-field ${opponentBattleField[i]?.status === GameModels.FieldStatus.WILDERNESS ? 'wilderness' : ''}`}
          id={`opponent-bzone-${i}`}
        >
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
      ))}
      {/* プレイヤーのバトルフィールド */}
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={`player-bzone-${i}`}
          className={`card-slot battle-field ${playerBattleField[i]?.status === GameModels.FieldStatus.WILDERNESS ? 'wilderness' : ''}`}
          id={`player-bzone-${i}`}
        >
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
      ))}
      {/* プレイヤーのゾーン（最後の1行目） */}
      {/* スタンバイフィールド */}
      {[0, 1, 2, 3, 4].map((i) => (
        <ArcherElement
          id={`archer-player-szone-${i}`}
          key={`player-szone-${i}`}
        >
          <div
            key={`player-szone-${i}`}
            className={`card-slot standby-field ${isDragging ? 'highlight' : ''}`}
            id={`player-szone-${i}`}
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
      ))}
    </div>
  );
};

export default GameBoard;
