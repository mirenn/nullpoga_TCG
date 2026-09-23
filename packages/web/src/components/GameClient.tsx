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
import Link from 'next/link';
import { getActiveDeck } from '../utils/deckStorage';

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
  const [flyingCards, setFlyingCards] = useState<FlyingCardState[]>([]);

  const currentGameState = extractedGameResponse?.gameRoom?.gameState;
  const { isGameOver, result: gameResult, message: gameOverMessage } = GameUtils.checkGameOver(
    currentGameState,
    userId,
  );

  const handleDragStart = (event: React.DragEvent<HTMLDivElement>) => {
    if (isAnimating || isGameOver) {
      event.preventDefault();
      return;
    }
    const target = event.target as HTMLElement;
    const cardElement = target.closest('.card');
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
      const checkRes = GameUtils.checkGameOver(res[0]?.gameRoom?.gameState, userId!);
      if (checkRes.isGameOver) {
        setTurnMessage(checkRes.message);
      } else {
        setTurnMessage('カードを召喚・攻撃指示して「Submit Actions」を押してください');
      }
    } else {
      setTurnMessage('「Start Game」を押してゲームを開始してください');
    }
  };

  const handleActionSubmit = async () => {
    if (!token || isAnimating || isGameOver) return;
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
              // 召喚アクションが含まれているか確認（自分・相手の同時召喚を判定）
              const summonActorIds = actorIds.filter(
                (actorId) =>
                  actionDict[actorId]?.actionType === 'SUMMON_MONSTER' ||
                  actionDict[actorId]?.actionType === 'SUMMON_PHASE_END'
              );

              if (summonActorIds.length > 0) {
                const CARD_WIDTH = 72;
                const CARD_HEIGHT = 98;
                const newFlyingCards: FlyingCardState[] = [];
                const flyingSlotIds: string[] = [];
                const summonSlotIds: string[] = [];
                const summonCards: Record<string, GameModels.MonsterCard> = {};

                const summonInfos = summonActorIds.map((actorId) => {
                  const act = actionDict[actorId];
                  const isMe = actorId === userId;
                  const actorName = isMe ? 'あなた' : '相手(BOT)';
                  const card = act.actionData?.monsterCard;
                  const cardName = card?.cardName || 'モンスター';
                  const slotIdx = act.actionData?.summonStandbyFieldIdx;
                  const slotId = isMe ? `player-szone-${slotIdx}` : `opponent-szone-${slotIdx}`;
                  return { actorId, act, isMe, actorName, card, cardName, slotIdx, slotId };
                });

                // バナーメッセージ設定
                if (summonInfos.length >= 2) {
                  const myInfo = summonInfos.find((s) => s.isMe);
                  const oppInfo = summonInfos.find((s) => !s.isMe);
                  if (myInfo && oppInfo) {
                    setTurnMessage(`【同時召喚】あなた「${myInfo.cardName}」と相手「${oppInfo.cardName}」が同時に召喚！`);
                  } else {
                    setTurnMessage(`【同時召喚】双方が同時にモンスターを召喚！`);
                  }
                } else {
                  setTurnMessage(`【召喚】${summonInfos[0].actorName}が「${summonInfos[0].cardName}」を召喚！`);
                }

                // 始点・終点座標の計算
                for (const info of summonInfos) {
                  let startRect: { top: number; left: number; width: number; height: number } | null = null;
                  if (info.isMe) {
                    const cardEl = info.card?.uniqId ? document.getElementById(`player-hand-card-${info.card.uniqId}`) : null;
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

                  const slotEl = document.getElementById(info.slotId);
                  let endRect: { top: number; left: number; width: number; height: number } | null = null;
                  if (slotEl) {
                    const rect = slotEl.getBoundingClientRect();
                    endRect = {
                      top: rect.top + (rect.height - CARD_HEIGHT) / 2,
                      left: rect.left + (rect.width - CARD_WIDTH) / 2,
                      width: CARD_WIDTH,
                      height: CARD_HEIGHT,
                    };
                  }

                  if (startRect && endRect && info.card) {
                    newFlyingCards.push({ card: info.card, startRect, endRect });
                    flyingSlotIds.push(info.slotId);
                  }
                  summonSlotIds.push(info.slotId);
                  if (info.card) {
                    summonCards[info.slotId] = info.card;
                  }
                }

                // フライト演出の実行（手札からスロットへ飛ぶ：両者同時）
                if (newFlyingCards.length > 0) {
                  setActionEffect({ flyingSlotIds });
                  setFlyingCards(newFlyingCards);
                  await new Promise((r) => setTimeout(r, 600));
                  setFlyingCards([]);
                }

                // 着地：盤面更新（両プレイヤーの状態を同時に反映）
                if (stepState.player1) animRoomState.gameRoom.gameState.player1 = stepState.player1;
                if (stepState.player2) animRoomState.gameRoom.gameState.player2 = stepState.player2;
                setExtractedGameResponse(structuredClone(animRoomState));

                // 着地パルス（シアン色の光彩と衝撃波：両スロット同時）
                setActionEffect({
                  summonSlotIds,
                  summonCards,
                  isLanding: true,
                });
                await new Promise((r) => setTimeout(r, 650));
                setActionEffect(null);
              }

              // 攻撃アクションが含まれているか確認（自分・相手の同時攻撃を並列実行）
              const attackActorIds = actorIds.filter(
                (actorId) => actionDict[actorId]?.actionType === 'MONSTER_ATTACK'
              );

              if (attackActorIds.length > 0) {
                const attackInfos = attackActorIds.map((actorId) => {
                  const act = actionDict[actorId];
                  const isMe = actorId === userId;
                  const actorName = isMe ? 'あなた' : '相手(BOT)';
                  const cardName = act.actionData?.monsterCard?.cardName || 'モンスター';
                  const attackerIdx = act.actionData?.attackerIdx;
                  const targetIdx = act.actionData?.targetIdx;
                  const damage = act.actionData?.monsterCard?.attack ?? 0;

                  const attackerSlotId = isMe ? `player-bzone-${attackerIdx}` : `opponent-bzone-${attackerIdx}`;
                  const targetSlotId = isMe ? `opponent-bzone-${targetIdx}` : `player-bzone-${targetIdx}`;

                  return {
                    actorId,
                    act,
                    isMe,
                    actorName,
                    cardName,
                    attackerIdx,
                    targetIdx,
                    damage,
                    attackerSlotId,
                    targetSlotId,
                  };
                });

                // バナーメッセージ設定（同時激突時のメッセージ）
                if (attackInfos.length >= 2) {
                  const myInfo = attackInfos.find((a) => a.isMe);
                  const oppInfo = attackInfos.find((a) => !a.isMe);
                  if (myInfo && oppInfo) {
                    setTurnMessage(
                      `【同時攻撃】あなたの「${myInfo.cardName}」(💥${myInfo.damage}) と 相手の「${oppInfo.cardName}」(💥${oppInfo.damage}) が激突！`
                    );
                  } else {
                    setTurnMessage(`【同時攻撃】双方が同時に攻撃！`);
                  }
                } else {
                  const info = attackInfos[0];
                  setTurnMessage(`【攻撃】${info.actorName}の「${info.cardName}」の攻撃！（💥 ${info.damage} ダメージ）`);
                }

                // 攻撃エフェクトを並列実行
                const attacks = attackInfos.map((info) => ({
                  attackerSlotId: info.attackerSlotId,
                  targetSlotId: info.targetSlotId,
                  damage: info.damage,
                  isPlayerAttack: info.isMe,
                }));

                setActionEffect({
                  attacks,
                  attackerSlotId: attacks[0].attackerSlotId,
                  targetSlotId: attacks[0].targetSlotId,
                  damage: attacks[0].damage,
                  isPlayerAttack: attacks[0].isPlayerAttack,
                });

                // 攻撃アニメーション再生（激突・振動・ダメージ表示）
                await new Promise((r) => setTimeout(r, 1200));
                setActionEffect(null);

                // 着弾後に盤面状態を反映（モンスターのHP減少、撃破モンスターの退場、ダイレクトアタックのライフ・荒野反映）
                if (stepState.player1) animRoomState.gameRoom.gameState.player1 = stepState.player1;
                if (stepState.player2) animRoomState.gameRoom.gameState.player2 = stepState.player2;
                setExtractedGameResponse(structuredClone(animRoomState));
                await new Promise((r) => setTimeout(r, 400));
              }

              // スペルアクションが含まれているか確認
              const spellActorIds = actorIds.filter(
                (actorId) => actionDict[actorId]?.actionType === 'CAST_SPELL'
              );

              if (spellActorIds.length > 0) {
                const SPELL_EMOJIS: Record<number, string> = {
                  101: '☄️',
                  102: '🪨',
                  103: '🔄',
                  104: '🛡️',
                  105: '🔯',
                  106: '🔥',
                  107: '🌧️',
                };
                const isFizzled = spellActorIds.some((id) => actionDict[id]?.actionData?.fizzled);
                if (isFizzled) {
                  setTurnMessage(`【スペル不発】同一スペルの競合により呪文が打ち消し合いました！`);
                  setActionEffect({
                    spellEmoji: '💨 不発!',
                  });
                  await new Promise((r) => setTimeout(r, 1200));
                  setActionEffect(null);
                  if (stepState.player1) animRoomState.gameRoom.gameState.player1 = stepState.player1;
                  if (stepState.player2) animRoomState.gameRoom.gameState.player2 = stepState.player2;
                  setExtractedGameResponse(structuredClone(animRoomState));
                  await new Promise((r) => setTimeout(r, 400));
                } else {
                  for (const actorId of spellActorIds) {
                    const act = actionDict[actorId];
                    const isMe = actorId === userId;
                    const actorName = isMe ? 'あなた' : '相手(BOT)';
                    const spellCard = act.actionData?.spellCard;
                    const cardName = spellCard?.cardName || 'スペル';
                    const cardNo = spellCard?.cardNo;
                    const spellEmoji = (cardNo && SPELL_EMOJIS[cardNo]) || '✨';

                    const targetIdx = act.actionData?.targetIdx;
                    const targetPlayerId = act.actionData?.targetPlayerId;
                    const targetZone = act.actionData?.targetZone;

                    let spellSlotId: string | undefined;
                    if (targetIdx !== undefined) {
                      const isTargetMe = targetPlayerId === userId;
                      if (targetZone === 'STANDBY') {
                        spellSlotId = isTargetMe ? `player-szone-${targetIdx}` : `opponent-szone-${targetIdx}`;
                      } else {
                        spellSlotId = isTargetMe ? `player-bzone-${targetIdx}` : `opponent-bzone-${targetIdx}`;
                      }
                    }

                    setTurnMessage(`【スペル発動】${actorName}が「${cardName}」を発動！`);
                    setActionEffect({
                      spellEmoji,
                      spellSlotId,
                    });
                    await new Promise((r) => setTimeout(r, 1000));
                    setActionEffect(null);

                    if (stepState.player1) animRoomState.gameRoom.gameState.player1 = stepState.player1;
                    if (stepState.player2) animRoomState.gameRoom.gameState.player2 = stepState.player2;
                    setExtractedGameResponse(structuredClone(animRoomState));
                    await new Promise((r) => setTimeout(r, 400));
                  }
                }
              }

              // 召喚・攻撃・スペル以外のアクション（進軍、移動など）を処理
              const otherActorIds = actorIds.filter(
                (id) => !summonActorIds.includes(id) && !attackActorIds.includes(id) && !spellActorIds.includes(id)
              );
              for (const actorId of otherActorIds) {
                const act = actionDict[actorId];
                const isMe = actorId === userId;
                const actorName = isMe ? 'あなた' : '相手(BOT)';

                if (act.actionType === 'MONSTER_ADVANCE') {
                  const card = act.actionData?.monsterCard;
                  const cardName = card?.cardName || 'モンスター';
                  const fromIdx = act.actionData?.fromStandbyIdx ?? 0;
                  const toIdx = act.actionData?.toBattleIdx ?? 0;
                  const startSlotId = isMe ? `player-szone-${fromIdx}` : `opponent-szone-${fromIdx}`;
                  const endSlotId = isMe ? `player-bzone-${toIdx}` : `opponent-bzone-${toIdx}`;

                  setTurnMessage(`【進軍】${actorName}の「${cardName}」が前線へ進軍！`);

                  const CARD_WIDTH = 72;
                  const CARD_HEIGHT = 98;
                  const startEl = document.getElementById(startSlotId);
                  const endEl = document.getElementById(endSlotId);
                  let startRect: { top: number; left: number; width: number; height: number } | null = null;
                  let endRect: { top: number; left: number; width: number; height: number } | null = null;

                  if (startEl) {
                    const sRect = startEl.getBoundingClientRect();
                    startRect = {
                      top: sRect.top + (sRect.height - CARD_HEIGHT) / 2,
                      left: sRect.left + (sRect.width - CARD_WIDTH) / 2,
                      width: CARD_WIDTH,
                      height: CARD_HEIGHT,
                    };
                  }
                  if (endEl) {
                    const eRect = endEl.getBoundingClientRect();
                    endRect = {
                      top: eRect.top + (eRect.height - CARD_HEIGHT) / 2,
                      left: eRect.left + (eRect.width - CARD_WIDTH) / 2,
                      width: CARD_WIDTH,
                      height: CARD_HEIGHT,
                    };
                  }

                  // フライト演出の実行（待機ゾーンからバトルゾーンへ飛行移動）
                  if (startRect && endRect && card) {
                    setActionEffect({ flyingSlotId: startSlotId });
                    setFlyingCards([{ card, startRect, endRect }]);
                    await new Promise((r) => setTimeout(r, 600));
                    setFlyingCards([]);
                  }

                  // 着地：該当プレイヤーのみ盤面を更新
                  const isActorP1 = animRoomState.gameRoom.gameState.player1?.userId === actorId;
                  if (isActorP1) {
                    if (stepState.player1) animRoomState.gameRoom.gameState.player1 = stepState.player1;
                  } else {
                    if (stepState.player2) animRoomState.gameRoom.gameState.player2 = stepState.player2;
                  }
                  setExtractedGameResponse(structuredClone(animRoomState));

                  // バトルスロットへの着地パルス
                  setActionEffect({
                    summonSlotId: endSlotId,
                    summonCard: card,
                    isLanding: true,
                  });
                  await new Promise((r) => setTimeout(r, 650));
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
      const checkRes = GameUtils.checkGameOver(finalStateResponse.gameRoom?.gameState, userId!);
      if (checkRes.isGameOver) {
        setTurnMessage(checkRes.message);
      } else {
        setTurnMessage('ターン終了！次の行動を計画してください。');
      }
    } catch (error) {
      console.error('Turn animation error:', error);
      setTurnMessage('エラーが発生しました。もう一度お試しください。');
    } finally {
      setFlyingCards([]);
      setActionEffect(null);
      setIsAnimating(false);
    }
  };

  const handleCancelSpell = (uniqId: string) => {
    GameUtils.cancelPlannedSpell(
      uniqId,
      userId!,
      extractedGameResponse,
      setExtractedGameResponse,
      spellPhaseActions,
      setSpellPhaseActions
    );
  };

  const handleSpellPhaseEnd = () => {
    if (isAnimating || isGameOver) return;
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

  const handleStartGame = async () => {
    if (token) {
      const activeDeck = getActiveDeck();
      const success = await GameUtils.startGame(token, activeDeck?.cards);
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 20px', maxWidth: '1360px', margin: '0 auto 6px auto', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px', whiteSpace: 'nowrap' }}>
              ヌルポガ TCG
            </h1>
          </div>
          <div
            className="turn-message-banner"
            id="turn-banner"
            style={{
              margin: '0',
              flex: '1',
              maxWidth: '560px',
              backgroundColor: isGameOver
                ? gameResult === 'VICTORY'
                  ? '#065f46'
                  : gameResult === 'DEFEAT'
                  ? '#991b1b'
                  : '#334155'
                : undefined,
              color: isGameOver ? '#ffffff' : undefined,
            }}
          >
            {isGameOver ? gameOverMessage : turnMessage}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <Link
              href="/deck"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#2563eb',
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '6px',
                textDecoration: 'none',
                transition: 'all 0.15s ease',
              }}
            >
              🃏 デッキ構築
            </Link>
            <span style={{ fontSize: '12px', color: '#475569', whiteSpace: 'nowrap' }}>
              <strong>{userId}</strong>
            </span>
            <button
              onClick={logout}
              style={{
                padding: '3px 10px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                background: '#ffffff',
                color: '#475569',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              ログアウト
            </button>
          </div>
        </div>

        {/* 3カラムメインレイアウト */}
        <div className="game-main-layout">
          {/* 左サイドパネル：戦況HUD（相手＆自分） */}
          <div className="layout-left-col">
            <OpponentStats
              gameState={extractedGameResponse?.gameRoom?.gameState}
              myUserId={userId}
            />
            <PlayerStats
              gameState={extractedGameResponse?.gameRoom?.gameState}
              myUserId={userId}
            />
          </div>

          {/* 中央：メイン盤面 ＆ 手札 */}
          <div className="layout-center-col">
            <GameBoard
              myUserId={userId}
              isDragging={isDragging}
              actionEffect={actionEffect}
              isAnimating={isAnimating}
              isGameOver={isGameOver}
            />
            <Hand
              myUserId={userId}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              isAnimating={isAnimating}
              isGameOver={isGameOver}
              flyingCardUniqIds={flyingCards.map((fc) => fc.card.uniqId)}
            />
          </div>

          {/* 右サイドパネル：アクション操作パネル */}
          <div className="layout-right-col">
            <ButtonContainer
              onStartGame={handleStartGame}
              onActionSubmit={handleActionSubmit}
              onSpellPhaseEnd={handleSpellPhaseEnd}
              spellPhaseActions={spellPhaseActions}
              onCancelSpell={handleCancelSpell}
              isAnimating={isAnimating}
              isGameOver={isGameOver}
            />
          </div>
        </div>

        <ResultContainer
          gameState={extractedGameResponse?.gameRoom?.gameState}
          myUserId={userId}
          onStartGame={handleStartGame}
        />
      </ArcherContainer>
      {flyingCards.map((fc, idx) => (
        <FlyingCard
          key={fc.card.uniqId || `flying-card-${idx}`}
          card={fc.card}
          startRect={fc.startRect}
          endRect={fc.endRect}
          durationMs={580}
        />
      ))}
    </div>
  );
}

export default GameClient;
