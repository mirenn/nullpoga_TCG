import * as GameModels from './gameModels.js';
const HOST =
  process.env.NODE_ENV === 'production'
    ? window.location.origin
    : 'http://127.0.0.1:8000';

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
  extractedGameResponse: GameModels.GameStateResponse | null,
  setExtractedGameResponse: React.Dispatch<
    React.SetStateAction<GameModels.GameStateResponse | null>
  >,
  standbyFieldIndex: number,
  summon_phase_actions: GameModels.Action[],
  set_summon_phase_actions: React.Dispatch<
    React.SetStateAction<GameModels.Action[]>
  >,
) {
  const newExtractedGameResponse = structuredClone(extractedGameResponse);
  const myPlayer = getPlayerByUserId(
    newExtractedGameResponse?.game_state,
    myUserId,
  );
  if (myPlayer === null) {
    return null;
  }
  const playerHand = myPlayer.plan_hand_cards;
  const standbyField = myPlayer.plan_zone.standby_field;

  // 手札からuniq_idに一致するモンスターを探す
  const cardIndex = playerHand.findIndex((card) => card.uniq_id === uniq_id);

  // 該当するモンスターカードが見つかった場合
  if (cardIndex !== -1) {
    const summonedCard = playerHand[cardIndex];

    // 手札からカードを削除
    playerHand.splice(cardIndex, 1);
    myPlayer.plan_mana -= summonedCard.mana_cost;

    if (summonedCard.card_type === GameModels.CardType.MONSTER) {
      // フィールドにカードを追加
      standbyField[standbyFieldIndex] = summonedCard;
      summon_phase_actions.push({
        action_type: GameModels.ActionType.SUMMON_MONSTER,
        action_data: {
          monster_card: summonedCard,
          summon_standby_field_idx: standbyFieldIndex,
        },
      });
      set_summon_phase_actions(summon_phase_actions);

      console.log(`Monster ${summonedCard.card_name} has been summoned!`);
    }

    setExtractedGameResponse(newExtractedGameResponse);
  } else {
    console.error('Monster card not found in hand.');
  }
}

export function planAttackMonster(
  uniq_id: string,
  myUserId: string,
  extractedGameResponse: GameModels.GameStateResponse | null,
  setExtractedGameResponse: React.Dispatch<
    React.SetStateAction<GameModels.GameStateResponse | null>
  >,
  activity_phase_actions: GameModels.Action[],
  set_activity_phase_actions: React.Dispatch<
    React.SetStateAction<GameModels.Action[]>
  >,
) {
  const newExtractedGameResponse = structuredClone(extractedGameResponse);
  const newActivityPhaseActions = structuredClone(activity_phase_actions);
  const myPlayer = getPlayerByUserId(
    newExtractedGameResponse?.game_state,
    myUserId,
  );
  if (myPlayer === null) {
    return null;
  }
  const btField = myPlayer.plan_zone.battle_field;

  // フィールドからuniq_idに一致するモンスターを探す
  const cardIndex = btField.findIndex((slot) => slot.card?.uniq_id === uniq_id);
  const attackedCard = btField[cardIndex].card;
  // 該当するモンスターカードが見つかった場合
  if (cardIndex !== -1 && attackedCard) {
    attackedCard.can_act = false;
    attackedCard.attack_declaration = true;
    newActivityPhaseActions.push({
      action_type: GameModels.ActionType.MONSTER_ATTACK,
      action_data: {
        monster_card: attackedCard,
      },
    });
    set_activity_phase_actions(newActivityPhaseActions);

    console.log(`Monster ${attackedCard.card_name} is planning an attack!`);
    setExtractedGameResponse(newExtractedGameResponse);
  } else {
    console.error('Monster card not found in standby field.');
  }
}

/**
 * 指定したuser_idを持つプレイヤーをgameStateから取得する関数
 * @param gameState - ゲームの状態（State）
 * @param user_id - 検索するユーザーID
 * @returns - user_idに一致するPlayerオブジェクト
 */
export function getPlayerByUserId(
  gameState: GameModels.State | undefined,
  user_id: string,
): GameModels.Player | null {
  if (gameState === undefined) {
    return null;
  }

  // player_1のuser_idが一致するか確認
  if (gameState.player_1.user_id === user_id) {
    return gameState.player_1;
  }

  // player_2のuser_idが一致するか確認
  if (gameState.player_2.user_id === user_id) {
    return gameState.player_2;
  }

  // 該当するプレイヤーが見つからなければnullを返す
  console.error(`Player with user_id ${user_id} not found.`);
  return null;
}
/**
 * 指定したuser_idを除外したプレイヤーをgameStateから取得する関数
 * @param gameState - ゲームの状態（State）
 * @param user_id - 除外するユーザーID
 * @returns - user_idに一致しないPlayerオブジェクト
 */
export function getPlayerExcludingUserId(
  gameState: GameModels.State | undefined,
  user_id: string,
): GameModels.Player | null {
  if (gameState === undefined) {
    return null;
  }

  // player_1のuser_idが一致しないか確認
  if (gameState.player_1.user_id !== user_id) {
    return gameState.player_1;
  }

  // player_2のuser_idが一致しないか確認
  if (gameState.player_2.user_id !== user_id) {
    return gameState.player_2;
  }

  // 該当するプレイヤーが見つからなければnullを返す
  console.error(`Opponent with user_id ${user_id} not found.`);
  return null;
}

/**
 * Actionをサーバーに送信
 * @param userId
 * @param spell_phase_actions
 * @param summon_phase_actions
 * @param activity_phase_actions
 * @returns
 */
export async function actionSubmit(
  userId: string,
  spell_phase_actions: GameModels.Action[],
  summon_phase_actions: GameModels.Action[],
  activity_phase_actions: GameModels.Action[],
) {
  const url = HOST + `/submit_action_with_random_cpu/${userId}`;

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
  userId: string,
): Promise<GameModels.GameStateResponse[] | null> {
  const url = HOST + `/test_game_state/${userId}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }

    const data: GameModels.GameStateResponse = await response.json();
    console.log('Game State:', data);

    return [data, data];
  } catch (error) {
    console.error('Failed to fetch game state:', error);
    return null;
  }
}

export function getActionDictByUserId(
  actionDict: GameModels.ActionDict | null,
  userId: string,
): GameModels.Action | null {
  if (actionDict === null) {
    return null;
  }

  return actionDict[userId];
}

export function getActionDictExcludingUserId(
  actionDict: GameModels.ActionDict | null,
  userId: string,
): GameModels.Action | null {
  if (actionDict === null) {
    return null;
  }

  const opponentId = Object.keys(actionDict).find((key) => key !== userId);
  if (!opponentId) {
    return null;
  }
  return actionDict[opponentId];
}

/**
 * プレイヤーと対戦相手の現在のアクションを提供されたアクション辞書に基づいて表示します。
 *
 * @param actionDict - 全プレイヤーのアクションを含む辞書。nullの場合もあります。
 * @param myUserId - 現在のプレイヤーのユーザーID。
 *
 * @remarks
 * この関数は、ユーザーIDを使用して現在のプレイヤーのアクションを取得し、それをStateに反映します。
 *
 * @todo
 * 指定された場所に各アクションタイプの処理ロジックを実装します。
 */
export function displayCurrentAction(
  actionDict: GameModels.ActionDict | null,
  myUserId: string,
) {
  const playerAction = getActionDictByUserId(actionDict, myUserId);
  if (playerAction) {
    console.log('Player Action:', playerAction);
    // ここでアクションに合わせた処理を書く
    // 召喚の場合
    if (playerAction.action_type === GameModels.ActionType.SUMMON_MONSTER) {
      console.log('Summon Monster:', playerAction.action_data);
    }
    //攻撃の場合
    if (playerAction.action_type === GameModels.ActionType.MONSTER_ATTACK) {
      console.log('Monster Attack:', playerAction.action_data);
    }
  }
  const opponentAction = getActionDictExcludingUserId(actionDict, myUserId);
  if (opponentAction) {
    console.log('Opponent Action:', opponentAction);
  }
}
