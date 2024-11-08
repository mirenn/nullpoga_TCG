
import React from 'react';

const GameBoard: React.FC = () => {
  return (
    <div className="game-board">
      {/* 相手のゾーン（最初の1行目） */}
      {/* スタンバイフィールド */}
      {[4, 3, 2, 1, 0].map(i => (
        <div key={`opponent-szone-${i}`} className="card-slot standby-field" id={`opponent-szone-${i}`}></div>
      ))}
      {/* バトルフィールド */}
      {[4, 3, 2, 1, 0].map(i => (
        <div key={`opponent-bzone-${i}`} className="card-slot battle-field" id={`opponent-bzone-${i}`}></div>
      ))}
      {/* バトルフィールド */}
      {[0, 1, 2, 3, 4].map(i => (
        <div key={`player-bzone-${i}`} className="card-slot battle-field" id={`player-bzone-${i}`}></div>
      ))}
      {/* プレイヤーのゾーン（最後の1行目） */}
      {/* スタンバイフィールド */}
      {[0, 1, 2, 3, 4].map(i => (
        <div key={`player-szone-${i}`} className="card-slot standby-field" id={`player-szone-${i}`}></div>
      ))}
    </div>
  );
}

export default GameBoard;