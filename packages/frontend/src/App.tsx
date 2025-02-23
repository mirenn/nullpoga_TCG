import { useState, useEffect, useContext } from 'react';
import GameBoard from './components/GameBoard';
import Hand from './components/Hand';
import PlayerStats from './components/PlayerStats';
import ButtonContainer from './components/ButtonContainer';
import ResultContainer from './components/ResultContainer';
import LoginForm from './components/LoginForm';
import * as GameUtils from './gameUtils.js';
import { GameContext } from './gameContext';
import { useAuth } from './authContext';
import './App.css';
import OpponentStats from './components/OpponentStats.js';
import { ArcherContainer } from 'react-archer';

function App() {
  const { token, userId } = useAuth();
  const {
    extractedGameResponse,//盤面に展開される情報。gameResponse => extractedGameResponseに反映して盤面に反映される順
    //TODO:↑おそらく簡単に戻したり進めたりするための実装が必要。少し難しいため後回し
    setExtractedGameResponse,
    gameResponse,//サーバーから最後に帰ってきたgameResponseを保持//画面の反映には現状使わない//やり直すときよう?
    setGameResponse,
    spellPhaseActions,
    summonPhaseActions,
    activityPhaseActions,
  } = useContext(GameContext);
  const [isDragging, setIsDragging] = useState(false);

  // もしログインしていない場合は、ログインフォームを表示
  if (!token || !userId) {
    return (
      <div className="login-container">
        <h1>ヌルポガTCG</h1>
        <LoginForm />
      </div>
    );
  }

  const handleDragStart = (event: React.DragEvent<HTMLDivElement>) => {
    const target = event.target as HTMLDivElement;
    event.dataTransfer.setData('text', target.id);
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

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
    const res = await GameUtils.getgameResponse(token!);
    if (res) {
      setExtractedGameResponse(res[0]);
      console.log(extractedGameResponse, res[0]);
      setGameResponse(res[1]);
    }
  };

  const handleActionSubmit = () => {
    GameUtils.actionSubmit(
      spellPhaseActions,
      summonPhaseActions,
      activityPhaseActions,
      token!
    );
  };

  const handleSpellPhaseEnd = () => {
    console.log('End Spell Phase');
    const newExtractedGameResponse = structuredClone(extractedGameResponse);
    const state = newExtractedGameResponse?.gameRoom?.gameState;
    const myPlayer = GameUtils.getPlayerByUserId(state, userId);
    if (myPlayer) {
      for (let i = 0; i < 5; i++) {
        if (
          myPlayer.planZone.standbyField[i] &&
          myPlayer.planZone.battleField[i].card === null
        ) {
          myPlayer.planZone.battleField[i].card =
            myPlayer.planZone.standbyField[i];
          myPlayer.planZone.standbyField[i] = null;
        }
      }
      setExtractedGameResponse(newExtractedGameResponse);
    }
  };

  const handleRenderExecuteEndPhase = () => {
    const newExtractedGameResponse = structuredClone(extractedGameResponse);
    const history = newExtractedGameResponse?.gameRoom?.gameState?.history;
    let renderLastHisIndex =
      newExtractedGameResponse?.gameRoom?.gameState?.renderLastHisIndex;
    if (!history) {
      return;
    }

    if (renderLastHisIndex === undefined) {
      renderLastHisIndex = 0;
    } else {
      if (history.length > renderLastHisIndex + 1) {
        renderLastHisIndex += 1;
      } else {
        renderLastHisIndex = undefined; //メモ：一周したら未定義に戻す
      }
    }
    console.log('Render Execute End Phase', renderLastHisIndex, history);

    const lasthis = history[history.length - 1];
    if (renderLastHisIndex !== undefined) {
      const lastState = lasthis[renderLastHisIndex].State;
      newExtractedGameResponse.gameRoom.gameState.player1 = lastState.player1;
      newExtractedGameResponse.gameRoom.gameState.player2 = lastState.player2;
      newExtractedGameResponse.gameRoom.gameState.renderLastHisIndex =
        renderLastHisIndex;
    } else {
      if (gameResponse?.gameRoom?.gameState?.player1) {
        newExtractedGameResponse.gameRoom.gameState.player1 =
          gameResponse.gameRoom.gameState.player1;
      }
      if (gameResponse?.gameRoom?.gameState?.player2) {
        newExtractedGameResponse.gameRoom.gameState.player2 =
          gameResponse.gameRoom.gameState.player2;
      }
      newExtractedGameResponse.gameRoom.gameState.renderLastHisIndex =
        renderLastHisIndex;
    }
    setExtractedGameResponse(newExtractedGameResponse);
    //メモ：ActionDictを取ってきて、現在何が起ころうとしているかを表示する
    //と思ったが、コンポーネント側で処理するように変更予定//TODO
    //GameUtils.displayCurrentAction(lasthis.actionDict, myUserId);
  };

  const handleStartGame = async () => {
    if (token) {
      await GameUtils.startGame(token);
      // ゲーム開始後に最新の状態を取得
      handleGetGameState();
    }
  };

  // ログインしている場合は、ゲーム画面を表示
  return (
    <div>
      <ArcherContainer strokeColor="red">
        <h1>nullpogaTCG client仮実装</h1>
        <OpponentStats
          gameState={extractedGameResponse?.gameRoom?.gameState}
          myUserId={userId}
        />
        <GameBoard myUserId={userId} isDragging={isDragging} />
        <Hand
          myUserId={userId}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        />
        <PlayerStats
          gameState={extractedGameResponse?.gameRoom?.gameState}
          myUserId={userId}
        />
        <ButtonContainer
          onStartGame={handleStartGame}
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
