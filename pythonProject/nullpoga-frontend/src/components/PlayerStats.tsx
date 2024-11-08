
import React from 'react';

const PlayerStats: React.FC = () => {
  return (
    <div className="player-stats">
      <p>ライフ: <span id="player-life"></span></p>
      <p>マナ: <span id="player-mana"></span></p>
      <p>プランマナ: <span id="player-plan-mana"></span></p>
      <p>phase: <span id="player-phase"></span></p>
    </div>
  );
}

export default PlayerStats;