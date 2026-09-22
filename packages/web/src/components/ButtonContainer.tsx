interface ButtonContainerProps {
  onStartGame: () => void;
  onActionSubmit: () => void;
  onSpellPhaseEnd: () => void;
  isAnimating?: boolean;
  isGameOver?: boolean;
}

const ButtonContainer = ({
  onStartGame,
  onActionSubmit,
  onSpellPhaseEnd,
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
  </div>
);

export default ButtonContainer;

