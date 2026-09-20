'use client';

import { useState, useEffect, useContext } from 'react';
import GameBoard, { ActionEffect } from './GameBoard';
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
    setSpellPhaseActions,
    summonPhaseActions,
    setSummonPhaseActions,
    activityPhaseActions,
    setActivityPhaseActions,
  } = useContext(GameContext);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [turnMessage, setTurnMessage] = useState<string>('カードを召喚・攻撃指示して「Submit Actions」を押してください');
  const [actionEffect, setActionEffect] = useState<ActionEffect | null>(null);

  const handleDragStart = (event: React.DragEvent<HTMLDivElement>) => {
    if (isAnimating) {
      event.preventDefault();
      return;
    }
    const target = event.target as HTMLElement;
    const cardElement = target.closest('.card.monster-card');
    if (cardElement) {
      event.dataTransfer.setData('text', cardElement.id);
      setIsDragging(true);
    }
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (token) {
      handleGetGameState();
    }
  }, [token]);

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

  const handleActionSubmit = async () => {
    if (!token || isAnimating) return;
    setIsAnimating(true);
    setTurnMessage('アクション提出中...');

    try {
      await GameUtils.actionSubmit(
        spellPhaseActions,
        summonPhaseActions,
        activityPhaseActions,
        token!
      );
      setSpellPhaseActions([]);
      setSummonPhaseActions([]);
      setActivityPhaseActions([]);

      // 最新状態（履歴含む）を取得
      const res = await GameUtils.getgameResponse(token!);
      if (!res || !res[0]) {
        setTurnMessage('カードを召喚・攻撃指示して「Submit Actions」を押してください');
        setIsAnimating(false);
        return;
      }

      const finalStateResponse = res[0];
      const history = finalStateResponse.gameRoom?.gameState?.history;

      // 直近ターンの履歴を順次アニメーション再生
      if (history && history.length > 0) {
        const lastTurnSteps = history[history.length - 1];
        if (lastTurnSteps && lastTurnSteps.length > 0) {
          const animRoomState = structuredClone(finalStateResponse);

          for (let i = 0; i < lastTurnSteps.length; i++) {
            const step = lastTurnSteps[i];
            const stepState = step.State;
            const actionDict = step.ActionDict || {};

            // 盤面をこのステップ時点の状態に更新
            if (stepState.player1) animRoomState.gameRoom.gameState.player1 = stepState.player1;
            if (stepState.player2) animRoomState.gameRoom.gameState.player2 = stepState.player2;
            setExtractedGameResponse(structuredClone(animRoomState));

            const actorIds = Object.keys(actionDict);
            if (actorIds.length === 0) {
              setTurnMessage(`アクション実行中... (${i + 1}/${lastTurnSteps.length})`);
              await new Promise((r) => setTimeout(r, 600));
            } else {
              for (const actorId of actorIds) {
                const act = actionDict[actorId];
                const isMe = actorId === userId;
                const actorName = isMe ? 'あなた' : '相手(BOT)';

                if (act.actionType === 'SUMMON_MONSTER' || act.actionType === 'SUMMON_PHASE_END') {
                  const card = act.actionData?.monsterCard;
                  const cardName = card?.cardName || 'モンスター';
                  const slotIdx = act.actionData?.summonStandbyFieldIdx;
                  const slotId = isMe ? `player-szone-${slotIdx}` : `opponent-szone-${slotIdx}`;

                  setTurnMessage(`【召喚】${actorName}が「${cardName}」を召喚！`);
                  setActionEffect({
                    summonSlotId: slotId,
                    summonCard: card,
                  });
                  await new Promise((r) => setTimeout(r, 1100));
                  setActionEffect(null);
                } else if (act.actionType === 'MONSTER_ATTACK') {
                  const cardName = act.actionData?.monsterCard?.cardName || 'モンスター';
                  const attackerIdx = act.actionData?.attackerIdx;
                  const targetIdx = act.actionData?.targetIdx;
                  const damage = act.actionData?.monsterCard?.attack ?? 0;

                  const attackerSlotId = isMe ? `player-bzone-${attackerIdx}` : `opponent-bzone-${attackerIdx}`;
                  const targetSlotId = isMe ? `opponent-bzone-${targetIdx}` : `player-bzone-${targetIdx}`;

                  setTurnMessage(`【攻撃】${actorName}の「${cardName}」の攻撃！（💥 ${damage} ダメージ）`);
                  setActionEffect({
                    attackerSlotId,
                    targetSlotId,
                    isPlayerAttack: isMe,
                    damage,
                  });
                  await new Promise((r) => setTimeout(r, 1200));
                  setActionEffect(null);
                } else if (act.actionType === 'MONSTER_MOVE') {
                  setTurnMessage(`【進軍】${actorName}のモンスターが進軍！`);
                  await new Promise((r) => setTimeout(r, 600));
                }
              }
            }
          }
        }
      }

      // 最終状態（新ターンのドロー・マナ・進軍反映）をセット
      setExtractedGameResponse(finalStateResponse);
      setGameResponse(res[1]);
      setTurnMessage('ターン終了！次の行動を計画してください。');
    } catch (error) {
      console.error('Turn animation error:', error);
      setTurnMessage('エラーが発生しました。もう一度お試しください。');
    } finally {
      setActionEffect(null);
      setIsAnimating(false);
    }
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
      await handleGetGameState();
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
        <h1 style={{ textAlign: 'center', margin: '16px 0 8px 0' }}>ヌルポガ TCG</h1>
        <div className="turn-message-banner" id="turn-banner">
          {turnMessage}
        </div>
        <OpponentStats
          gameState={extractedGameResponse?.gameRoom?.gameState}
          myUserId={userId}
        />
        <GameBoard myUserId={userId} isDragging={isDragging} actionEffect={actionEffect} />
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
          isAnimating={isAnimating}
        />
        <ResultContainer
          gameState={extractedGameResponse?.gameRoom?.gameState}
          myUserId={userId}
        />
      </ArcherContainer>
    </div>
  );
}

export default GameClient;
