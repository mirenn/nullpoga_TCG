import React from 'react';
import * as GameModels from '../types/gameModels';
import * as GameUtils from '../utils/gameUtils';

interface ResultContainerProps {
  gameState?: GameModels.State;
  myUserId?: string;
}

const ResultContainer: React.FC<ResultContainerProps> = ({ gameState, myUserId }) => {
  if (!gameState || !myUserId) {
    return <div className="result-container" id="result"></div>;
  }

  const myPlayer = GameUtils.getPlayerByUserId(gameState, myUserId);
  const opponent = GameUtils.getPlayerExcludingUserId(gameState, myUserId);

  if (!myPlayer || !opponent) {
    return <div className="result-container" id="result"></div>;
  }

  // 終了条件チェック
  const myWildernessAll = myPlayer.zone.battleField?.every(
    (slot) => slot.status === GameModels.FieldStatus.WILDERNESS
  );
  const opponentWildernessAll = opponent.zone.battleField?.every(
    (slot) => slot.status === GameModels.FieldStatus.WILDERNESS
  );

  const isGameOver =
    myPlayer.life <= 0 ||
    opponent.life <= 0 ||
    myWildernessAll ||
    opponentWildernessAll;

  if (!isGameOver) {
    return <div className="result-container" id="result"></div>;
  }

  let resultText = '';
  let resultClass = '';

  if (myPlayer.life <= 0 && opponent.life <= 0) {
    if (myPlayer.life > opponent.life) {
      resultText = 'VICTORY!';
      resultClass = 'victory';
    } else if (opponent.life > myPlayer.life) {
      resultText = 'DEFEAT...';
      resultClass = 'defeat';
    } else {
      resultText = 'DRAW GAME';
      resultClass = 'draw';
    }
  } else if (opponent.life <= 0 || opponentWildernessAll) {
    resultText = 'VICTORY!';
    resultClass = 'victory';
  } else if (myPlayer.life <= 0 || myWildernessAll) {
    resultText = 'DEFEAT...';
    resultClass = 'defeat';
  }

  return (
    <div className={`result-container ${resultClass}`} id="result" style={{
      marginTop: '20px',
      padding: '16px',
      textAlign: 'center',
      fontSize: '28px',
      fontWeight: 'bold',
      backgroundColor: resultClass === 'victory' ? '#e6ffed' : resultClass === 'defeat' ? '#ffeef0' : '#f6f8fa',
      border: `2px solid ${resultClass === 'victory' ? '#2da44e' : resultClass === 'defeat' ? '#cf222e' : '#8c959f'}`,
      borderRadius: '8px',
      color: resultClass === 'victory' ? '#1a7f37' : resultClass === 'defeat' ? '#cf222e' : '#24292f'
    }}>
      {resultText}
    </div>
  );
};

export default ResultContainer;