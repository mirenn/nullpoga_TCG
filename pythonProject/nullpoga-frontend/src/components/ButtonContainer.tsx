
import React from 'react';

const ButtonContainer: React.FC = () => {
  return (
    <div className="button-container">
      <button id="get-game-state" className="fetch-button">Get Game State</button>
      <button id="render-hand" className="blue-button">render hand</button>
      <button id="spell-phase-end" className="blue-button">spell phase end</button>
      <button id="summon-phase-end" className="blue-button">summon phase end</button>
      <button id="action-submit" className="blue-button">submit</button>
      {/* <button id="result-next" className="blue-button">result next</button> */}
    </div>
  );
}

export default ButtonContainer;