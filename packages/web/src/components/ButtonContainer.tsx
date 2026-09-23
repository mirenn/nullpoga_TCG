import * as GameModels from '../types/gameModels';

interface ButtonContainerProps {
  onStartGame: () => void;
  onActionSubmit: () => void;
  onSpellPhaseEnd: () => void;
  spellPhaseActions?: GameModels.Action[];
  onCancelSpell?: (uniqId: string) => void;
  isAnimating?: boolean;
  isGameOver?: boolean;
}

const ButtonContainer = ({
  onStartGame,
  onActionSubmit,
  onSpellPhaseEnd,
  spellPhaseActions = [],
  onCancelSpell,
  isAnimating = false,
  isGameOver = false,
}: ButtonContainerProps) => (
  <div className="button-container">
    <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textAlign: 'center', marginBottom: '2px', letterSpacing: '0.5px' }}>
      🎮 アクション操作
    </div>
    <button
      id="action-submit"
      className="game-button submit-action-button"
      onClick={onActionSubmit}
      disabled={isAnimating || isGameOver}
    >
      {isAnimating ? '処理中...' : isGameOver ? '対戦終了' : 'Submit Actions ➔'}
    </button>
    <button
      id="spell-phase-end"
      className="game-button spell-phase-button"
      onClick={onSpellPhaseEnd}
      disabled={isAnimating || isGameOver}
    >
      End Spell Phase
    </button>
    <button
      id="start-game"
      className="game-button start-game-button"
      onClick={onStartGame}
      disabled={isAnimating}
    >
      {isGameOver ? '↺ New Game' : 'Start Game'}
    </button>

    {spellPhaseActions && spellPhaseActions.length > 0 && (
      <div className="planned-spells-container">
        <div className="planned-spells-header">詠唱準備中のスペル:</div>
        {spellPhaseActions.map((action, idx) => {
          const spell = action.actionData?.spellCard;
          if (!spell) return null;
          return (
            <div key={spell.uniqId || idx} className="planned-spell-chip">
              <span>{spell.cardName} (コスト{spell.manaCost})</span>
              {onCancelSpell && (
                <button
                  className="cancel-spell-btn"
                  onClick={() => onCancelSpell(spell.uniqId)}
                  disabled={isAnimating || isGameOver}
                  title="取り消す"
                >
                  ✕
                </button>
              )}
            </div>
          );
        })}
      </div>
    )}
  </div>
);

export default ButtonContainer;
