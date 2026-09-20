interface ButtonContainerProps {
  onGetGameState: () => void;
  onStartGame: () => void;
  onActionSubmit: () => void;
  onSpellPhaseEnd: () => void;
  onRenderExecuteEndPhase: () => void;
  isAnimating?: boolean;
}

const ButtonContainer = ({
  onGetGameState,
  onStartGame,
  onActionSubmit,
  onSpellPhaseEnd,
  onRenderExecuteEndPhase,
  isAnimating = false,
}: ButtonContainerProps) => (
  <div className="button-container">
    <button
      id="start-game"
      className="blue-button"
      onClick={onStartGame}
      disabled={isAnimating}
    >
      Start Game
    </button>
    <button
      id="get-game-state"
      className="blue-button"
      onClick={onGetGameState}
      disabled={isAnimating}
    >
      Get Game State
    </button>
    <button
      id="spell-phase-end"
      className="blue-button"
      onClick={onSpellPhaseEnd}
      disabled={isAnimating}
    >
      End Spell Phase
    </button>
    <button
      id="action-submit"
      className="blue-button"
      onClick={onActionSubmit}
      disabled={isAnimating}
    >
      {isAnimating ? '処理中...' : 'Submit Actions'}
    </button>
    <button
      id="render-execute-end-phase"
      onClick={onRenderExecuteEndPhase}
      disabled={isAnimating}
    >
      Render Execute End Phase
    </button>
  </div>
);

export default ButtonContainer;
