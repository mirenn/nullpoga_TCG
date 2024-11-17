import { useState, useEffect, useContext } from 'react';
import GameBoard from './components/GameBoard';
import Hand from './components/Hand';
import PlayerStats from './components/PlayerStats';
import ButtonContainer from './components/ButtonContainer';
import ResultContainer from './components/ResultContainer';
import * as GameUtils from './gameUtils.js';
import { GameContext } from './gameContext';
import './App.css';
import OpponentStats from './components/OpponentStats.js';

function App() {
  const {
    extractedGameResponse,
    setExtractedGameResponse,
    setGameResponse,
    spellPhaseActions,
    summonPhaseActions,
    activityPhaseActions,
  } = useContext(GameContext);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = (event: React.DragEvent<HTMLDivElement>) => {
    const target = event.target as HTMLDivElement;
    event.dataTransfer.setData('text', target.id);
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const myUserId = 'user_id_1';

  useEffect(() => {
    console.log('extractedGameResponse updated:', extractedGameResponse);
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
    const res = await GameUtils.getgameResponse(myUserId);
    if (res) {
      setExtractedGameResponse(res[0]);
      console.log(extractedGameResponse, res[0]);
      setGameResponse(res[1]);
    }
  };

  const handleActionSubmit = () => {
    GameUtils.actionSubmit(
      myUserId,
      spellPhaseActions,
      summonPhaseActions,
      activityPhaseActions,
    );
  };

  const handleSpellPhaseEnd = () => {
    console.log('End Spell Phase');
    const newExtractedGameResponse = structuredClone(extractedGameResponse);
    const state = newExtractedGameResponse?.game_state;
    const myPlayer = GameUtils.getPlayerByUserId(state, myUserId);
    if (myPlayer) {
      for (let i = 0; i < 5; i++) {
        if (
          myPlayer.plan_zone.standby_field[i] &&
          myPlayer.plan_zone.battle_field[i].card === null
        ) {
          myPlayer.plan_zone.battle_field[i].card =
            myPlayer.plan_zone.standby_field[i];
          myPlayer.plan_zone.standby_field[i] = null;
        }
      }
      setExtractedGameResponse(newExtractedGameResponse);
    }
  };

  const handleSummonPhaseEnd = () => {
    const monsterCards = document.querySelectorAll(
      '.card-slot.battle-field .monster-card',
    );
    monsterCards.forEach(function (card) {
      const attackButton = card.querySelector('.attack-button');
      if (attackButton) {
        //const canAttack = checkIfCanAttack(card);
        const canAttack = true; //TODO：checkIfCanAttackの実装
        if (canAttack) {
          attackButton.removeAttribute('disabled');
        } else {
          attackButton.setAttribute('disabled', 'true');
        }
        attackButton.addEventListener('click', function () {
          const monsterId = card.getAttribute('id');
          console.log(monsterId + ' が攻撃を宣言しました');
          GameUtils.planAttackMonster(
            monsterId,
            GameUtils.getPlayerByUserId(
              extractedGameResponse?.game_state,
              myUserId,
            ),
            activityPhaseActions,
          );
          attackButton.setAttribute('disabled', 'true');
        });
      }
    });
  };

  return (
    <div>
      <h1>nullpogaTCG client仮実装</h1>
      <OpponentStats
        gameState={extractedGameResponse?.game_state}
        myUserId={myUserId}
      />
      <GameBoard myUserId={myUserId} isDragging={isDragging} />
      <Hand
        myUserId={myUserId}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      />
      <PlayerStats
        gameState={extractedGameResponse?.game_state}
        myUserId={myUserId}
      />
      <ButtonContainer
        onGetGameState={handleGetGameState}
        onActionSubmit={handleActionSubmit}
        onSummonPhaseEnd={handleSummonPhaseEnd}
        onSpellPhaseEnd={handleSpellPhaseEnd}
      />
      <ResultContainer />
    </div>
  );
}

export default App;
