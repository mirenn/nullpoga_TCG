interface ButtonContainerProps {
  onGetGameState: () => void;
  //onRenderHand: () => void;
  onActionSubmit: () => void;
  onSummonPhaseEnd: () => void;
  onSpellPhaseEnd: () => void;
}

const ButtonContainer = ({
  onGetGameState,
  //onRenderHand,
  onActionSubmit,
  onSummonPhaseEnd,
  onSpellPhaseEnd,
}: ButtonContainerProps) => (
  <div className="button-container">
    <button
      id="get-game-state"
      className="blue-button"
      onClick={onGetGameState}
    >
      Get Game State
    </button>
    {/* <button id="render-hand" className="blue-button" onClick={onRenderHand}>Render Hand</button> */}
    <button
      id="summon-phase-end"
      className="blue-button"
      onClick={onSummonPhaseEnd}
    >
      End Summon Phase
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
  </div>
);

export default ButtonContainer;
