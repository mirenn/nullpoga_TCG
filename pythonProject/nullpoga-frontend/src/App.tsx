import { useState, useEffect, useContext } from 'react';
import GameBoard from './components/GameBoard';
import Hand from './components/Hand';
import PlayerStats from './components/PlayerStats';
import ButtonContainer from './components/ButtonContainer';
import ResultContainer from './components/ResultContainer';
import * as GameUtils from './gameUtils.js';
import { GameContext } from './gameContext';
import './App.css';

function App() {
  const {
    extractedGameResponse,
    setExtractedGameResponse,
    gameResponse, //使わないかも
    setGameResponse,
    spellPhaseActions,
    setSpellPhaseActions,
    summonPhaseActions,
    setSummonPhaseActions,
    activityPhaseActions,
    setActivityPhaseActions,
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

  const handleRenderHand = () => {
    if (extractedGameResponse) {
      const gameState = extractedGameResponse.game_state;
      const myHandCds = GameUtils.getPlayerByUserId(
        gameState,
        myUserId,
      )?.hand_cards;
      if (myHandCds) {
        //GameUtils.renderHand(myHandCds, dropAreas);
        //myHandCdsをHandに描画
        //return <Hand cards={myHandCds} />;
      }
    } else {
      console.error('Game state is not loaded yet');
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

  const handleSpellPhaseEnd = () => {
    GameUtils.moveCardsToBattleFieldFromStandby(
      extractedGameResponse,
      myUserId,
    );
  };

  return (
    <div>
      <h1>nullpogaTCG client仮実装</h1>
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
        //onRenderHand={handleRenderHand}
        onActionSubmit={handleActionSubmit}
        onSummonPhaseEnd={handleSummonPhaseEnd}
        onSpellPhaseEnd={handleSpellPhaseEnd}
      />
      <ResultContainer />
    </div>
  );
}

export default App;
