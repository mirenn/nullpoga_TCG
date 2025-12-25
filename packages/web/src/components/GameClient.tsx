'use client';

import { useState, useEffect, useContext } from 'react';
import GameBoard from './GameBoard';
import Hand from './Hand';
import PlayerStats from './PlayerStats';
import ButtonContainer from './ButtonContainer';
import ResultContainer from './ResultContainer';
import LoginForm from './LoginForm';
import * as GameUtils from '../utils/gameUtils';
import { GameContext } from '../context/gameContext';
import { useAuth } from '../context/authContext';
import '../app/App.css'; // Path to App.css 
import OpponentStats from './OpponentStats';
import { ArcherContainer } from 'react-archer';

function GameClient() {
  const { token, userId } = useAuth();
  const {
    extractedGameResponse,
    setExtractedGameResponse,
    gameResponse,
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
    if (!token) return;
    const res = await GameUtils.getgameResponse(token!);
    if (res) {
      setExtractedGameResponse(res[0]);
      console.log(extractedGameResponse, res[0]);
      setGameResponse(res[1]);
    }
  };

  const handleActionSubmit = () => {
    if (!token) return;
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
    const myPlayer = GameUtils.getPlayerByUserId(state, userId!);
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
        renderLastHisIndex = undefined; 
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
  };

  const handleStartGame = async () => {
    if (token) {
      await GameUtils.startGame(token);
      handleGetGameState();
    }
  };

  if (!token || !userId) {
    return (
      <div className="login-container">
        <h1>ヌルポガTCG</h1>
        <LoginForm />
      </div>
    );
  }

  return (
    <div>
      <ArcherContainer strokeColor="red">
        <h1>nullpogaTCG client (Next.js)</h1>
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

export default GameClient;
