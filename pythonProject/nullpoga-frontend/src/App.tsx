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
import { ArcherContainer } from 'react-archer';

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

  const handleRenderExecuteEndPhase = () => {
    console.log('Render Execute End Phase');
    const newExtractedGameResponse = structuredClone(extractedGameResponse);
    const history = newExtractedGameResponse?.game_state?.history;
    let renderLastHisIndex =
      newExtractedGameResponse?.game_state?.renderLastHisIndex;
    if (!history) {
      return;
    }

    if (renderLastHisIndex) {
      if (history.length > renderLastHisIndex + 1) {
        renderLastHisIndex += 1;
      } else {
        renderLastHisIndex = undefined; //メモ：一周したら未定義に戻す
      }
    } else {
      renderLastHisIndex = 0;
    }
    const lasthis = history[history.length - 1];
    if (renderLastHisIndex !== undefined) {
      const lastState = lasthis[renderLastHisIndex].State;
      newExtractedGameResponse.game_state.player_1 = lastState.player_1;
      newExtractedGameResponse.game_state.player_2 = lastState.player_2;
      newExtractedGameResponse.game_state.renderLastHisIndex =
        renderLastHisIndex;
      setExtractedGameResponse(newExtractedGameResponse);
    }

    //メモ：ActionDictを取ってきて、現在何が起ころうとしているかを表示する
    //と思ったが、コンポーネント側で処理するように変更予定//TODO
    //GameUtils.displayCurrentAction(lasthis.actionDict, myUserId);
  };

  return (
    <div>
      <ArcherContainer strokeColor="red">
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
          onSpellPhaseEnd={handleSpellPhaseEnd}
          onRenderExecuteEndPhase={handleRenderExecuteEndPhase}
        />
        <ResultContainer />
      </ArcherContainer>
    </div>
  );
}

export default App;
