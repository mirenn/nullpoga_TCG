import * as GameModels from './gameModels.js';

const HOST =
  process.env.NODE_ENV === 'production'
    ? window.location.origin
    : 'http://localhost:3000'; // NestJSのデフォルトポートに変更

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
    
    const playerHand = myPlayer.planHandCards;
    const standbyField = myPlayer.planZone.standbyField;

    // 手札からuniq_idに一致するモンスターを探す
    const cardIndex = playerHand.findIndex((card) => card.uniqId === uniq_id);

    // 該当するモンスターカードが見つかった場合
    if (cardIndex !== -1) {
      const summonedCard = playerHand[cardIndex];

      // 手札からカードを削除
      playerHand.splice(cardIndex, 1);
      myPlayer.planMana -= summonedCard.manaCost;

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

        console.log(`Monster ${summonedCard.cardName} has been summoned!`);
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
 * @param userId
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
  const url = HOST + `/api/player_action`;

  const postData = {
    spell_phase_actions,
    summon_phase_actions,
    activity_phase_actions,
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(postData),
    });
    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }
    const res = await response.json();
    console.log('actionSubmit res', res);
  } catch (error) {
    console.error('Failed to actionSubmit:', error);
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
  const url = HOST + `/api/game-state`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }

    const data: GameModels.RoomStateResponse = await response.json();
    console.log('Game State:', data);

    return [data, data];
  } catch (error) {
    console.error('Failed to fetch game state:', error);
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

export async function startGame(token: string): Promise<void> {
  const url = HOST + `/api/start-game`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Start game response:', data);
  } catch (error) {
    console.error('Failed to start game:', error);
  }
}
