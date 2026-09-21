'use client';

import { useState, useEffect, useContext } from 'react';
import GameBoard, { ActionEffect } from './GameBoard';
import Hand from './Hand';
import PlayerStats from './PlayerStats';
import ButtonContainer from './ButtonContainer';
import ResultContainer from './ResultContainer';
import LoginForm from './LoginForm';
import * as GameUtils from '../utils/gameUtils';
import { useGameStore } from '../store/gameStore';
import { useAuth } from '../context/authContext';
import '../app/App.css'; // Path to App.css 
import OpponentStats from './OpponentStats';
import { ArcherContainer } from 'react-archer';
import FlyingCard from './FlyingCard';
import * as GameModels from '../types/gameModels';

interface FlyingCardState {
  card: GameModels.MonsterCard;
  startRect: { top: number; left: number; width: number; height: number };
  endRect: { top: number; left: number; width: number; height: number };
}

function GameClient() {
  const { token, userId, logout } = useAuth();
  const extractedGameResponse = useGameStore((s) => s.extractedGameResponse);
  const setExtractedGameResponse = useGameStore((s) => s.setExtractedGameResponse);
  const gameResponse = useGameStore((s) => s.gameResponse);
  const setGameResponse = useGameStore((s) => s.setGameResponse);
  const spellPhaseActions = useGameStore((s) => s.spellPhaseActions);
  const setSpellPhaseActions = useGameStore((s) => s.setSpellPhaseActions);
  const summonPhaseActions = useGameStore((s) => s.summonPhaseActions);
  const setSummonPhaseActions = useGameStore((s) => s.setSummonPhaseActions);
  const activityPhaseActions = useGameStore((s) => s.activityPhaseActions);
  const setActivityPhaseActions = useGameStore((s) => s.setActivityPhaseActions);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [turnMessage, setTurnMessage] = useState<string>('「Start Game」を押してゲームを開始してください');
  const [actionEffect, setActionEffect] = useState<ActionEffect | null>(null);
  const [flyingCard, setFlyingCard] = useState<FlyingCardState | null>(null);

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
      setTurnMessage('カードを召喚・攻撃指示して「Submit Actions」を押してください');
    } else {
      setTurnMessage('「Start Game」を押してゲームを開始してください');
    }
  };

  const handleActionSubmit = async () => {
    if (!token || isAnimating) return;
    setIsAnimating(true);
    setTurnMessage('アクション提出中...');

    // 計画中の仮配置をクリアし、即座に場を0枚・手札を提出前状態に戻してアニメーション準備
    setExtractedGameResponse((prev) => {
      if (!prev?.gameRoom?.gameState) return prev;
      const next = structuredClone(prev);
      const myP = GameUtils.getPlayerByUserId(next.gameRoom.gameState, userId!);
      if (myP) {
        myP.planZone = structuredClone(myP.zone);
        myP.planHandCards = structuredClone(myP.handCards);
        myP.planMana = myP.mana;
      }
      return next;
    });

    try {
      const submitRes = await GameUtils.actionSubmit(
        spellPhaseActions,
        summonPhaseActions,
        activityPhaseActions,
        token!
      );
      if (!submitRes) {
        setIsAnimating(false);
        setTurnMessage('アクションの提出に失敗しました');
        return;
      }
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

          // ターン開始時点（進軍完了・召喚前）のスナップショット（ステップ0）を初期盤面として設定
          const initialStep = lastTurnSteps[0];
          if (initialStep?.State) {
            if (initialStep.State.player1) animRoomState.gameRoom.gameState.player1 = initialStep.State.player1;
            if (initialStep.State.player2) animRoomState.gameRoom.gameState.player2 = initialStep.State.player2;
            setExtractedGameResponse(structuredClone(animRoomState));
            setTurnMessage('アクション実行開始！');
            await new Promise((r) => setTimeout(r, 600));
          }

          for (let i = 0; i < lastTurnSteps.length; i++) {
            const step = lastTurnSteps[i];
            const stepState = step.State;
            const actionDict = step.ActionDict || {};

            // TURN_START_SNAPSHOT の場合は初期スナップショット反映済みなのでスキップ
            if ((actionDict.system?.actionType as any) === 'TURN_START_SNAPSHOT') {
              continue;
            }

            const actorIds = Object.keys(actionDict);
            if (actorIds.length === 0) {
              if (stepState.player1) animRoomState.gameRoom.gameState.player1 = stepState.player1;
              if (stepState.player2) animRoomState.gameRoom.gameState.player2 = stepState.player2;
              setExtractedGameResponse(structuredClone(animRoomState));
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

                  // 始点と終点のDOM座標を取得（カード実体サイズ 80x120 の中央配置位置を正確に計算）
                  const CARD_WIDTH = 80;
                  const CARD_HEIGHT = 120;
                  let startRect: { top: number; left: number; width: number; height: number } | null = null;
                  if (isMe) {
                    const cardEl = card?.uniqId ? document.getElementById(`player-hand-card-${card.uniqId}`) : null;
                    if (cardEl) {
                      const rect = cardEl.getBoundingClientRect();
                      startRect = {
                        top: rect.top,
                        left: rect.left,
                        width: CARD_WIDTH,
                        height: CARD_HEIGHT,
                      };
                    } else {
                      const handEl = document.getElementById('player-hand');
                      if (handEl) {
                        const rect = handEl.getBoundingClientRect();
                        startRect = {
                          top: rect.top,
                          left: rect.left + (rect.width - CARD_WIDTH) / 2,
                          width: CARD_WIDTH,
                          height: CARD_HEIGHT,
                        };
                      }
                    }
                  } else {
                    const oppEl = document.getElementById('opponent-area');
                    if (oppEl) {
                      const rect = oppEl.getBoundingClientRect();
                      startRect = {
                        top: rect.top + (rect.height - CARD_HEIGHT) / 2,
                        left: rect.left + (rect.width - CARD_WIDTH) / 2,
                        width: CARD_WIDTH,
                        height: CARD_HEIGHT,
                      };
                    }
                  }

                  const slotEl = document.getElementById(slotId);
                  let endRect: { top: number; left: number; width: number; height: number } | null = null;
                  if (slotEl) {
                    const rect = slotEl.getBoundingClientRect();
                    // スロット（幅約200px）の中央にカード（幅80px、高さ120px）が配置されるため、
                    // スロット中央のカード座標を着地点として正確に設定
                    endRect = {
                      top: rect.top + (rect.height - CARD_HEIGHT) / 2,
                      left: rect.left + (rect.width - CARD_WIDTH) / 2,
                      width: CARD_WIDTH,
                      height: CARD_HEIGHT,
                    };
                  }

                  // フライト演出の実行（手札からスロットへ飛ぶ）
                  if (startRect && endRect && card) {
                    setActionEffect({ flyingSlotId: slotId });
                    setFlyingCard({ card, startRect, endRect });
                    await new Promise((r) => setTimeout(r, 600));
                    setFlyingCard(null);
                  }

                  // 着地：該当プレイヤーのみ盤面を更新（他プレイヤーのカードが先行出現するのを防ぐ）
                  const isActorP1 = animRoomState.gameRoom.gameState.player1?.userId === actorId;
                  if (isActorP1) {
                    if (stepState.player1) animRoomState.gameRoom.gameState.player1 = stepState.player1;
                  } else {
                    if (stepState.player2) animRoomState.gameRoom.gameState.player2 = stepState.player2;
                  }
                  setExtractedGameResponse(structuredClone(animRoomState));

                  // 着地パルス（シアン色の光彩と衝撃波）
                  setActionEffect({
                    summonSlotId: slotId,
                    summonCard: card,
                    isLanding: true,
                  });
                  await new Promise((r) => setTimeout(r, 650));
                  setActionEffect(null);
                } else if (act.actionType === 'MONSTER_ATTACK') {
                  if (stepState.player1) animRoomState.gameRoom.gameState.player1 = stepState.player1;
                  if (stepState.player2) animRoomState.gameRoom.gameState.player2 = stepState.player2;
                  setExtractedGameResponse(structuredClone(animRoomState));

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
                  if (stepState.player1) animRoomState.gameRoom.gameState.player1 = stepState.player1;
                  if (stepState.player2) animRoomState.gameRoom.gameState.player2 = stepState.player2;
                  setExtractedGameResponse(structuredClone(animRoomState));

                  setTurnMessage(`【進軍】${actorName}のモンスターが進軍！`);
                  await new Promise((r) => setTimeout(r, 650));
                }
              }
            }
          }
        }
      }

      // 最終状態（新ターンのドロー・マナ回復等）を反映
      setExtractedGameResponse(finalStateResponse);
      setGameResponse(res[1]);
      setTurnMessage('ターン終了！次の行動を計画してください。');
    } catch (error) {
      console.error('Turn animation error:', error);
      setTurnMessage('エラーが発生しました。もう一度お試しください。');
    } finally {
      setFlyingCard(null);
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
      const success = await GameUtils.startGame(token);
      if (success) {
        await handleGetGameState();
      }
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 16px', maxWidth: '1200px', margin: '0 auto' }}>
          <span style={{ fontSize: '14px', color: '#555' }}>
            プレイヤー: <strong>{userId}</strong>
          </span>
          <button
            onClick={logout}
            style={{
              padding: '4px 10px',
              fontSize: '12px',
              cursor: 'pointer',
              background: '#fff',
              border: '1px solid #ccc',
              borderRadius: '4px',
            }}
          >
            ログアウト
          </button>
        </div>
        <h1 style={{ textAlign: 'center', margin: '8px 0' }}>ヌルポガ TCG</h1>
        <div className="turn-message-banner" id="turn-banner">
          {turnMessage}
        </div>
        <OpponentStats
          gameState={extractedGameResponse?.gameRoom?.gameState}
          myUserId={userId}
        />
        <GameBoard
          myUserId={userId}
          isDragging={isDragging}
          actionEffect={actionEffect}
          isAnimating={isAnimating}
        />
        <Hand
          myUserId={userId}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          isAnimating={isAnimating}
          flyingCardUniqId={flyingCard?.card?.uniqId}
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
      {flyingCard && (
        <FlyingCard
          card={flyingCard.card}
          startRect={flyingCard.startRect}
          endRect={flyingCard.endRect}
          durationMs={580}
        />
      )}
    </div>
  );
}

export default GameClient;
