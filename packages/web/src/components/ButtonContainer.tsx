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
    <button
      id="start-game"
      className="game-button start-game-button"
      onClick={onStartGame}
      disabled={isAnimating}
    >
      {isGameOver ? 'New Game' : 'Start Game'}
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
      id="action-submit"
      className="game-button submit-action-button"
      onClick={onActionSubmit}
      disabled={isAnimating || isGameOver}
    >
      {isAnimating ? '処理中...' : isGameOver ? '対戦終了' : 'Submit Actions'}
    </button>
  </div>
);

export default ButtonContainer;

