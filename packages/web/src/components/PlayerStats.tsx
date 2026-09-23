import * as GameModels from '../types/gameModels';
import * as GameUtils from '../utils/gameUtils';

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
        <p style={{ fontWeight: 800, color: '#334155' }}>
          <span>👤 あなた</span>
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
        <p>
          <span>📚 山札:</span> <span id="player-deck-count" style={{ color: '#0f172a', fontWeight: 800 }}>{player.deckCards?.length ?? 0}枚</span>
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
