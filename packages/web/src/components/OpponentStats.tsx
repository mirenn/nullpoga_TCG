import * as GameModels from '../types/gameModels';
import * as GameUtils from '../utils/gameUtils';

interface OpponentStatsProps {
  gameState: GameModels.State | undefined;
  myUserId: string;
}

const OpponentStats = ({ gameState, myUserId }: OpponentStatsProps) => {
  try {
    const player = GameUtils.getPlayerExcludingUserId(gameState, myUserId);
    
    return (
      <div className="opponent-stats" id="opponent-area">
        <p style={{ fontWeight: 800, color: '#334155' }}>
          <span>🤖 相手 (BOT)</span>
        </p>
        <p>
          <span>❤️ ライフ:</span> <span id="player-life" style={{ color: '#dc2626', fontWeight: 800 }}>{player.life}</span>
        </p>
        <p>
          <span>💧 マナ:</span> <span id="player-mana" style={{ color: '#2563eb', fontWeight: 800 }}>{player.mana}</span>
        </p>
        <p>
          <span style={{ opacity: 0.75 }}>プランマナ:</span> <span id="player-plan-mana">{player.planMana}</span>
        </p>
        <p>
          <span>⏳ フェーズ:</span> <span id="player-phase" style={{ backgroundColor: '#f1f5f9', padding: '1px 6px', borderRadius: '4px', fontSize: '12px' }}>{player.phase}</span>
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
