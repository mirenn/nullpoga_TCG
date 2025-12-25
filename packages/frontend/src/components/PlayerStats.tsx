import * as GameModels from '../gameModels';
import * as GameUtils from '../gameUtils';

interface PlayerStatsProps {
  gameState: GameModels.State | undefined;
  myUserId: string;
}

const PlayerStats = ({ gameState, myUserId }: PlayerStatsProps) => {
  try {
    const player = GameUtils.getPlayerByUserId(gameState, myUserId);
    if (!player) return null;
    
    return (
      <div className="player-stats">
        <p>
          ライフ: <span id="player-life">{player.life}</span>
        </p>
        <p>
          マナ: <span id="player-mana">{player.mana}</span>
        </p>
        <p>
          プランマナ: <span id="player-plan-mana">{player.planMana}</span>
        </p>
        <p>
          phase: <span id="player-phase">{player.phase}</span>
        </p>
      </div>
    );
  } catch (error) {
    console.error('PlayerStats error:', error);
    return (
      <div className="player-stats">
        <p>プレイヤーデータを読み込み中...</p>
      </div>
    );
  }
};

export default PlayerStats;
