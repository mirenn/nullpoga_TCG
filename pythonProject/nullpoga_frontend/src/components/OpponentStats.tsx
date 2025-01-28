import * as GameModels from '../gameModels';
import * as GameUtils from '../gameUtils';

interface OpponentStatsProps {
  gameState: GameModels.State | undefined;
  myUserId: string;
}

const OpponentStats = ({ gameState, myUserId }: OpponentStatsProps) => {
  const player = GameUtils.getPlayerExcludingUserId(gameState, myUserId);

  return (
    <div className="player-stats">
      <p>
        ライフ: <span id="player-life">{player?.life}</span>
      </p>
      <p>
        マナ: <span id="player-mana">{player?.mana}</span>
      </p>
      <p>
        プランマナ: <span id="player-plan-mana">{player?.plan_mana}</span>
      </p>
      <p>
        phase: <span id="player-phase">{player?.phase}</span>
      </p>
    </div>
  );
};

export default OpponentStats;
