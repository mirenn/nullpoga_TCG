import React, { useState, useEffect } from 'react';
import * as GameModels from './gameModels.js';
import * as GameUtils from './gameUtils.js';

const GameBoard: React.FC = () => {
  const [extractedGameResponse, setExtractedGameResponse] = useState<GameModels.GameStateResponse | null>(null);
  const [gameResponse, setGameResponse] = useState<GameModels.GameStateResponse | null>(null);
  const [myUserId] = useState('user_id_1');
  const [spellPhaseActions, setSpellPhaseActions] = useState<GameModels.Action[]>([]);
  const [summonPhaseActions, setSummonPhaseActions] = useState<GameModels.Action[]>([]);
  const [activityPhaseActions, setActivityPhaseActions] = useState<GameModels.Action[]>([]);

  useEffect(() => {
    window.debugValues = {
      get extractedGameResponse() {
        return extractedGameResponse;
      },
      get summon_phase_actions() {
        return summonPhaseActions;
      },
      get activity_phase_actions() {
        return activityPhaseActions;
      },
    };
  }, [extractedGameResponse, summonPhaseActions, activityPhaseActions]);

  const handleGetGameState = async () => {
    const res = await GameUtils.getgameResponse(myUserId, extractedGameResponse, gameResponse);
    if (res) {
      setExtractedGameResponse(res[0]);
      setGameResponse(res[1]);
    }
  };

  const handleRenderHand = () => {
    if (extractedGameResponse) {
      const gameState = extractedGameResponse.game_state;
      const myHandCds = GameUtils.getPlayerByUserId(gameState, myUserId)?.hand_cards;
      if (myHandCds) {
        GameUtils.renderHand(myHandCds, dropAreas); // gameResponse から手札データを渡す
      }
    } else {
      console.error('Game state is not loaded yet');
    }
  };

  const handleActionSubmit = () => {
    GameUtils.actionSubmit(myUserId, spellPhaseActions, summonPhaseActions, activityPhaseActions);
  };

  const handleSummonPhaseEnd = () => {
    const monsterCards = document.querySelectorAll('.card-slot.battle-field .monster-card');
    monsterCards.forEach((card) => {
      const attackButton = card.querySelector('.attack-button');
      if (attackButton) {
        const canAttack = checkIfCanAttack(card);
        if (canAttack) {
          attackButton.removeAttribute('disabled');
        } else {
          attackButton.setAttribute('disabled', 'true');
        }
        attackButton.addEventListener('click', () => {
          const monsterId = card.getAttribute('id');
          console.log(monsterId + ' が攻撃を宣言しました');
          GameUtils.planAttackMonster(monsterId, GameUtils.getPlayerByUserId(extractedGameResponse?.game_state, myUserId), activityPhaseActions);
          attackButton.setAttribute('disabled', 'true');
        });
      }
    });
  };

  const handleSpellPhaseEnd = () => {
    GameUtils.moveCardsToBattleFieldFromStandby(extractedGameResponse, myUserId);
  };

  return (
    <div>
      <h1>nullpogaTCG client仮実装</h1>
      <div className="game-board">
        {/* Render opponent and player zones */}
        {Array.from({ length: 5 }).map((_, index) => (
          <React.Fragment key={index}>
            <div className="card-slot standby-field" id={`opponent-szone-${4 - index}`}></div>
            <div className="card-slot battle-field" id={`opponent-bzone-${4 - index}`}></div>
            <div className="card-slot battle-field" id={`player-bzone-${index}`}></div>
            <div className="card-slot standby-field" id={`player-szone-${index}`}></div>
          </React.Fragment>
        ))}
      </div>
      <div className="hand" id="player-hand"></div>
      <div className="player-stats">
        <p>ライフ: <span id="player-life"></span></p>
        <p>マナ: <span id="player-mana"></span></p>
        <p>プランマナ: <span id="player-plan-mana"></span></p>
        <p>phase: <span id="player-phase"></span></p>
      </div>
      <div className="button-container">
        <button onClick={handleGetGameState} className="fetch-button">Get Game State</button>
        <button onClick={handleRenderHand} className="blue-button">render hand</button>
        <button onClick={handleSpellPhaseEnd} className="blue-button">spell phase end</button>
        <button onClick={handleSummonPhaseEnd} className="blue-button">summon phase end</button>
        <button onClick={handleActionSubmit} className="blue-button">submit</button>
      </div>
      <div className="result-container" id="result"></div>
    </div>
  );
};

export default GameBoard;

function checkIfCanAttack(card: Element) {
  const uniq_id = card.getAttribute('id');
  const player = GameUtils.getPlayerByUserId(extractedGameResponse?.game_state, myUserId);
  const slot = player?.plan_zone.battle_field.find((slot) => slot.card?.uniq_id === uniq_id);
  if (slot) {
    return slot.card?.can_act;
  }
}
