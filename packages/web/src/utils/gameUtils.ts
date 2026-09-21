import * as GameModels from '../types/gameModels';
import { getApiClient } from '../lib/client';
import { handleUnauthorized } from '../context/authContext';

const HOST = '';

/**
 * 召喚操作に合わせたオブジェクト側の操作
 * モンスターカードを手札の配列から消して、フィールドの配列に追加する。
 * マナを減らす。summon_monster
 *
 * @param uniq_id
 * @param myPlayer
 * @param standbyFieldIndex
 * @returns
 */
export function planSummonMonster(
  uniq_id: string,
  myUserId: string,
  extractedGameResponse: GameModels.RoomStateResponse | null,
  setExtractedGameResponse: React.Dispatch<
    React.SetStateAction<GameModels.RoomStateResponse | null>
  >,
  standbyFieldIndex: number,
  summon_phase_actions: GameModels.Action[],
  set_summon_phase_actions: React.Dispatch<
    React.SetStateAction<GameModels.Action[]>
  >,
) {
  try {
    const newExtractedGameResponse = structuredClone(extractedGameResponse);
    const myPlayer = getPlayerByUserId(
      newExtractedGameResponse?.gameRoom.gameState,
      myUserId,
    );
    if(myPlayer === null) {
      console.error('Player not found');
      return;
    }
    
    const playerHand = myPlayer.planHandCards;
    const standbyField = myPlayer.planZone.standbyField;

    // 既にスロットにモンスターがいる場合は配置不可
    if (standbyField[standbyFieldIndex]) {
      console.warn(`スタンバイゾーンのスロット ${standbyFieldIndex} は既に埋まっています。`);
      return;
    }

    // 手札からuniq_idに一致するモンスターを探す
    const cardIndex = playerHand.findIndex((card) => card.uniqId === uniq_id) ?? -1;

    // 該当するモンスターカードが見つかった場合
    if (cardIndex !== -1 && playerHand && cardIndex < playerHand.length) {
      // モンスターカードを取得
      const summonedCard = playerHand[cardIndex];

      // マナコストのチェック
      const currentPlanMana = myPlayer.planMana !== undefined ? myPlayer.planMana : (myPlayer.mana ?? 0);
      if (summonedCard.manaCost > currentPlanMana) {
        console.warn(`マナが足りません: 必要マナ ${summonedCard.manaCost} > 現在のプランマナ ${currentPlanMana}`);
        return;
      }

      // 手札からカードを削除
      playerHand.splice(cardIndex, 1);
      myPlayer.planMana = currentPlanMana - summonedCard.manaCost;

      if (summonedCard.cardType === GameModels.CardType.MONSTER) {
        // フィールドにカードを追加
        standbyField[standbyFieldIndex] = summonedCard;
        summon_phase_actions.push({
          actionType: GameModels.ActionType.SUMMON_MONSTER,
          actionData: {
            monsterCard: summonedCard,
            summonStandbyFieldIdx: standbyFieldIndex,
          },
        });
        set_summon_phase_actions(summon_phase_actions);

        console.log(`Monster ${summonedCard.cardName} (Cost: ${summonedCard.manaCost}) summoned! Remaining mana: ${myPlayer.planMana}`);
      }

      setExtractedGameResponse(newExtractedGameResponse);
    } else {
      console.error('Monster card not found in hand.');
    }
  } catch (error) {
    console.error('Failed to summon monster:', error);
  }
}

export function planAttackMonster(
  uniq_id: string,
  myUserId: string,
  extractedGameResponse: GameModels.RoomStateResponse | null,
  setExtractedGameResponse: React.Dispatch<
    React.SetStateAction<GameModels.RoomStateResponse | null>
  >,
  activity_phase_actions: GameModels.Action[],
  set_activity_phase_actions: React.Dispatch<
    React.SetStateAction<GameModels.Action[]>
  >,
) {
  try {
    const newExtractedGameResponse = structuredClone(extractedGameResponse);
    const newActivityPhaseActions = structuredClone(activity_phase_actions);
    const myPlayer = getPlayerByUserId(
      newExtractedGameResponse?.gameRoom.gameState,
      myUserId,
    );
    if (!myPlayer) {
      console.error('Player not found in planAttackMonster');
      return;
    }
    
    const btField = myPlayer.planZone.battleField;

    // フィールドからuniq_idに一致するモンスターを探す
    const cardIndex = btField.findIndex((slot) => slot.card?.uniqId === uniq_id);
    const attackedCard = btField[cardIndex]?.card;
    
    // 該当するモンスターカードが見つかった場合
    if (cardIndex !== -1 && attackedCard) {
      attackedCard.canAct = false;
      attackedCard.attackDeclaration = true;
      newActivityPhaseActions.push({
        actionType: GameModels.ActionType.MONSTER_ATTACK,
        actionData: {
          monsterCard: attackedCard,
          attackerIdx: cardIndex,
          targetIdx: 4 - cardIndex,
        },
      });
      set_activity_phase_actions(newActivityPhaseActions);

      console.log(`Monster ${attackedCard.cardName} is planning an attack!`);
      setExtractedGameResponse(newExtractedGameResponse);
    } else {
      console.error('Monster card not found in battle field.');
    }
  } catch (error) {
    console.error('Failed to plan attack:', error);
  }
}

/**
 * 指定したuser_idを持つプレイヤーをgameStateから取得する関数
 * @param gameState - ゲームの状態（State）
 * @param userId - 検索するユーザーID
 * @returns - user_idに一致するPlayerオブジェクト
 */
export function getPlayerByUserId(
  gameState: GameModels.State | undefined,
  userId: string,
): GameModels.Player | null {
  if (gameState === undefined) {
    return null;
  }
  
  // player1のuserIdが一致するか確認
  if (gameState.player1.userId === userId) {
    if (!gameState.player1.life) gameState.player1.life = 0;
    if (!gameState.player1.mana) gameState.player1.mana = 0;
    if (!gameState.player1.planMana) gameState.player1.planMana = 0;
    return gameState.player1;
  }
  
  // player2のuserIdが一致するか確認
  if (gameState.player2.userId === userId) {
    if (!gameState.player2.life) gameState.player2.life = 0;
    if (!gameState.player2.mana) gameState.player2.mana = 0;
    if (!gameState.player2.planMana) gameState.player2.planMana = 0;
    return gameState.player2;
  }
  
  // プレイヤーIDが見つからない場合はエラーをスロー
  throw new Error(`Player with userId ${userId} not found.`);
}

/**
 * 指定したuser_idを除外したプレイヤーをgameStateから取得する関数
 * @param gameState - ゲームの状態（State）
 * @param userId - 除外するユーザーID
 * @returns - user_idに一致しないPlayerオブジェクト
 */
export function getPlayerExcludingUserId(
  gameState: GameModels.State | undefined,
  userId: string,
): GameModels.Player {
  if (gameState === undefined) {
    // ゲーム状態がない場合はデフォルト値を持つプレイヤーオブジェクトを返す
    return {
      userId: 'opponent',
      turnCount: 0,
      deckCards: [],
      planDeckCards: [],
      handCards: [],
      planHandCards: [],
      life: 0,
      mana: 0,
      planMana: 0,
      base_mana: 0,
      zone: {
        standbyField: [],
        battleField: []
      },
      planZone: {
        standbyField: [],
        battleField: []
      },
      phase: GameModels.PhaseKind.NONE,
      spellPhaseActions: [],
      summonPhaseActions: [],
      activityPhaseActions: [],
    } as GameModels.Player;
  }

  // player1のuserIdが一致しないか確認
  if (gameState.player1.userId !== userId) {
    if (!gameState.player1.life) gameState.player1.life = 0;
    if (!gameState.player1.mana) gameState.player1.mana = 0;
    if (!gameState.player1.planMana) gameState.player1.planMana = 0;
    return gameState.player1;
  }

  // player2のuserIdが一致しないか確認
  if (gameState.player2.userId !== userId) {
    if (!gameState.player2.life) gameState.player2.life = 0;
    if (!gameState.player2.mana) gameState.player2.mana = 0;
    if (!gameState.player2.planMana) gameState.player2.planMana = 0;
    return gameState.player2;
  }

  // 該当するプレイヤーが見つからない場合はデフォルト値を持つプレイヤーオブジェクトを返す
  return {
    userId: 'opponent',
    turnCount: 0,
    deckCards: [],
    planDeckCards: [],
    handCards: [],
    planHandCards: [],
    life: 0,
    mana: 0,
    planMana: 0,
    base_mana: 0,
    zone: {
      standbyField: [],
      battleField: []
    },
    planZone: {
      standbyField: [],
      battleField: []
    },
    phase: GameModels.PhaseKind.NONE,
    spellPhaseActions: [],
    summonPhaseActions: [],
    activityPhaseActions: []
  };
}

/**
 * Actionをサーバーに送信
 * @param spell_phase_actions
 * @param summon_phase_actions
 * @param activity_phase_actions
 * @param token
 * @returns
 */
export async function actionSubmit(
  spell_phase_actions: GameModels.Action[],
  summon_phase_actions: GameModels.Action[],
  activity_phase_actions: GameModels.Action[],
  token: string,
) {
  const roomId = localStorage.getItem('gameRoomId');
  
  if (!roomId) {
    console.error('No roomId found in localStorage');
    return null;
  }

  try {
    const api = getApiClient(token);
    const response = await api.api.player_action.$post({
      json: {
        spell_phase_actions,
        summon_phase_actions,
        activity_phase_actions,
        roomId,
      },
    });

    if (response.status === 401) {
      console.warn('Unauthorized in actionSubmit. Logging out.');
      handleUnauthorized();
      return null;
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.warn('Response not OK:', response.status, errorText);
      return null;
    }

    const res = await response.json();
    console.log('actionSubmit res', res);
    return res;
  } catch (error) {
    console.warn('Failed to actionSubmit:', error);
    return null;
  } finally {
    spell_phase_actions.length = 0;
    summon_phase_actions.length = 0;
    activity_phase_actions.length = 0;
  }
}

export async function getgameResponse(
  token: string,
): Promise<GameModels.RoomStateResponse[] | null> {
  try {
    const api = getApiClient(token);
    const response = await api.api['game-state'].$get();

    if (response.status === 401) {
      console.warn('Unauthorized in getgameResponse. Logging out.');
      handleUnauthorized();
      return null;
    }

    if (response.status === 404) {
      console.log('No active game found (user not in a room)');
      return null;
    }

    if (!response.ok) {
      console.warn(`Failed to fetch game state: HTTP ${response.status}`);
      return null;
    }

    const data = (await response.json()) as unknown as GameModels.RoomStateResponse;
    console.log('Game State:', data);
    
    // レスポンスからroomIdを取得して保存
    if (data && data.room_id) {
      localStorage.setItem('gameRoomId', data.room_id);
      console.log('Room ID saved:', data.room_id);
    }

    return [data, data];
  } catch (error) {
    console.warn('Failed to fetch game state:', error);
    return null;
  }
}

export function getRenderActionByUserId(
  game_state: GameModels.State | undefined,
  userId: string,
): GameModels.Action | null {
  if (game_state === undefined || game_state.renderLastHisIndex === undefined) {
    return null;
  }
  const actionDict =
    game_state.history[game_state.history.length - 1][
      game_state.renderLastHisIndex
    ].ActionDict;
  return actionDict[userId];
}

export function getActionDictExcludingUserId(
  game_state: GameModels.State | undefined,
  userId: string,
): GameModels.Action | null {
  if (game_state === undefined || game_state.renderLastHisIndex === undefined) {
    return null;
  }

  const actionDict =
    game_state.history[game_state.history.length - 1][
      game_state.renderLastHisIndex
    ].ActionDict;

  const opponentId = Object.keys(actionDict).find((key) => key !== userId);
  if (!opponentId) {
    return null;
  }
  return actionDict[opponentId];
}

export async function startGame(token: string): Promise<boolean> {
  try {
    const api = getApiClient(token);
    const response = await api.api['start-game'].$post();

    if (response.status === 401) {
      console.warn('Unauthorized in startGame. Logging out.');
      handleUnauthorized();
      return false;
    }

    if (!response.ok) {
      console.warn(`Failed to start game: HTTP ${response.status}`);
      return false;
    }
    const data = await response.json();
    console.log('Start game response:', data);
    
    // マッチングが成功した場合、roomIdをlocalStorageに保存
    if (data && (data as any).status === 'matched' && (data as any).roomId) {
      localStorage.setItem('gameRoomId', (data as any).roomId);
      console.log('Room ID saved from startGame:', (data as any).roomId);
    }
    return true;
  } catch (error) {
    console.warn('Failed to start game:', error);
    return false;
  }
}
