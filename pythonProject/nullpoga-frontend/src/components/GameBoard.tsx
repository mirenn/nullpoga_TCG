import * as GameModels from '../gameModels';
import * as GameUtils from '../gameUtils.js';
import MonsterCard from './MonsterCard.js';
import { GameContext } from '../gameContext.js';
import { useContext } from 'react';
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
  } = useContext(GameContext);

  const gameState = extractedGameResponse?.game_state;
  const player = GameUtils.getPlayerByUserId(gameState, myUserId);
  const opponent = GameUtils.getPlayerExcludingUserId(gameState, myUserId);

  const playerStandbyField = player?.plan_zone.standby_field || [];
  const opponentStandbyField = opponent?.plan_zone.standby_field || [];
  const playerBattleField = player?.plan_zone.battle_field || [];
  const opponentBattleField = opponent?.plan_zone.battle_field || [];

  return (
    <div className="game-board">
      {/* 相手のゾーン（最初の1行目） */}
      {/* スタンバイフィールド */}
      {[4, 3, 2, 1, 0].map((i) => (
        <div
          key={`opponent-szone-${i}`}
          className="card-slot standby-field"
          id={`opponent-szone-${i}`}
        ></div>
      ))}
      {/* バトルフィールド */}
      {[4, 3, 2, 1, 0].map((i) => (
        <div
          key={`opponent-bzone-${i}`}
          className="card-slot battle-field"
          id={`opponent-bzone-${i}`}
        ></div>
      ))}
      {/* バトルフィールド */}
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={`player-bzone-${i}`}
          className="card-slot battle-field"
          id={`player-bzone-${i}`}
        >
          {playerBattleField && playerBattleField[i]?.card ? (
            <MonsterCard
              card={playerBattleField[i].card as GameModels.MonsterCard}
              onDragStart={() => {}}
              onDragEnd={() => {}}
              draggable={false}
              canAttack={true}
            />
          ) : (
            <div className="empty-slot"></div>
          )}
        </div>
      ))}
      {/* プレイヤーのゾーン（最後の1行目） */}
      {/* スタンバイフィールド */}
      {[0, 1, 2, 3, 4].map((i) => (
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
      ))}
    </div>
  );
};

export default GameBoard;
