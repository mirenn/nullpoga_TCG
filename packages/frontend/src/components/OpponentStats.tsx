import * as GameModels from '../gameModels';
import * as GameUtils from '../gameUtils';

interface OpponentStatsProps {
  gameState: GameModels.State | undefined;
  myUserId: string;
}

const OpponentStats = ({ gameState, myUserId }: OpponentStatsProps) => {
  try {
    const player = GameUtils.getPlayerExcludingUserId(gameState, myUserId);
    
    return (
      <div className="player-stats">
        <h3>対戦相手</h3>
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
    console.error('OpponentStats error:', error);
    return (
      <div className="player-stats">
        <h3>対戦相手</h3>
        <p>対戦相手データを読み込み中...</p>
      </div>
    );
  }
};

export default OpponentStats;
