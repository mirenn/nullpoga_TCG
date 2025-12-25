interface ButtonContainerProps {
  onGetGameState: () => void;
  onStartGame: () => void;  // 追加
  onActionSubmit: () => void;
  onSpellPhaseEnd: () => void;
  onRenderExecuteEndPhase: () => void;
}

const ButtonContainer = ({
  onGetGameState,
  onStartGame,  // 追加
  onActionSubmit,
  onSpellPhaseEnd,
  onRenderExecuteEndPhase,
}: ButtonContainerProps) => (
  <div className="button-container">
    <button
      id="start-game"
      className="blue-button"
      onClick={onStartGame}
    >
      Start Game
    </button>
    <button
      id="get-game-state"
      className="blue-button"
      onClick={onGetGameState}
    >
      Get Game State
    </button>
    <button
      id="spell-phase-end"
      className="blue-button"
      onClick={onSpellPhaseEnd}
    >
      End Spell Phase
    </button>
    <button id="action-submit" className="blue-button" onClick={onActionSubmit}>
      Submit Actions
    </button>
    <button id="render-execute-end-phase" onClick={onRenderExecuteEndPhase}>
      Render Execute End Phase
    </button>
  </div>
);

export default ButtonContainer;
