import * as GameModels from './gameModels.js';
const HOST = 'http://127.0.0.1:8000';

// 手札のカードを描画する関数
export function renderHand(
  playerHand: (GameModels.MonsterCard | GameModels.SpellCard)[],
  dropAreas: HTMLElement[],
) {
  const handContainer = document.getElementById('player-hand');
  if (!handContainer) {
    console.error('Hand container element not found');
    return; // 要素が見つからない場合は処理を中断
  }
  handContainer.innerHTML = ''; // 手札のフィールドを一旦クリア

  // 手札のカードを一つずつ描画
  playerHand.forEach((card, index) => {
    const cardElement = document.createElement('div');
    if (card.card_type === GameModels.CardType.MONSTER) {
      //cardElement.className = 'card';
      cardElement.classList.add('card', 'monster-card');
      cardElement.id = `${card.uniq_id}`;
      cardElement.setAttribute('draggable', 'true');

      //<div class="monster-card" draggable="true">
      cardElement.innerHTML = `
          <img src="${card.image_url}" alt="${card.card_name}" class="monster-image" />
          <h3>${card.card_name}</h3>
          <p>Attack: ${card.attack}</p>
          <p>Life: ${card.life}</p>
        `;
      //</div>
    }
    cardElement.addEventListener('dragstart', (event: DragEvent) => {
      if (event.dataTransfer) {
        event.dataTransfer.setData('text/plain', cardElement.id);
        event.dataTransfer.effectAllowed = 'move';
      }
      highLightPlayerZone(dropAreas);
    });
    // ドラッグ終了時にすべてのスロットのハイライトを削除
    cardElement.addEventListener('dragend', () => {
      dropAreas.forEach((area) => {
        area.classList.remove('highlight'); // ハイライトを削除
      });
    });
    handContainer.appendChild(cardElement);
  });
}

export function highLightPlayerZone(dropAreas: HTMLElement[]) {
  dropAreas.forEach((area) => {
    area.classList.add('highlight'); // ハイライトを追加
  });
}

export function renderStandbyField(
  isPlayer: boolean,
  standbyField: (GameModels.MonsterCard | null)[],
) {
  standbyField.forEach((card, index) => {
    let slotId;
    if (isPlayer) {
      slotId = `player-szone-${index}`;
    } else {
      slotId = `opponent-szone-${index}`;
    }
    const slotElement = document.getElementById(slotId);
    if (slotElement) {
      slotElement.innerHTML = ''; // スロットのフィールドを一旦クリア
    }

    if (card && slotElement) {
      const cardElement = document.createElement('div');
      cardElement.classList.add('card', 'monster-card');
      cardElement.id = `${card.uniq_id}`;
      cardElement.innerHTML = `
        <img src="${card.image_url}" alt="${card.card_name}" class="monster-image" />
        <h3>${card.card_name}</h3>
        <p>Attack: ${card.attack}</p>
        <p>Life: ${card.life}</p>
      `;
      slotElement.appendChild(cardElement);
    }
  });
}

/**
 *
 * @param isPlayer プレイヤーかどうか
 * @param battleField バトルフィールドのスロット配列
 */
export function renderBtField(
  isPlayer: boolean,
  battleField: GameModels.Slot[],
) {
  battleField.forEach((slot, index) => {
    let slotId;
    if (isPlayer) {
      slotId = `player-bzone-${index}`;
    } else {
      slotId = `opponent-bzone-${index}`;
    }

    const slotElm = document.getElementById(slotId);
    if (slotElm) {
      slotElm.innerHTML = ''; // スロットのフィールドを一旦クリア
    }

    if (slot && slotElm) {
      const monster = slot.card;
      if (monster) {
        const cardElement = document.createElement('div');
        cardElement.classList.add('card', 'monster-card');
        cardElement.id = `${monster.uniq_id}`;
        cardElement.innerHTML = `
          <div class="mana-cost">${monster.mana_cost}</div>
          <img src="${monster.image_url}" alt="${monster.card_name}" class="monster-image" />
          <h3>${monster.card_name}</h3>
          <p>Attack: ${monster.attack}</p>
          <p>Life: ${monster.life}</p>
          <button class="attack-button" ${isPlayer ? '' : 'disabled'}>攻撃宣言</button>
        `;

        slotElm.appendChild(cardElement);
      }
    }
  });
}

export function renderPlayerStatus(player: GameModels.Player | null) {
  if (player === null) {
    return null;
  }
  //document.getElementById('player-plan-mana')?.textContent = ;
  const playerManaElement = document.getElementById('player-mana');
  if (playerManaElement) {
    playerManaElement.textContent = String(player.mana); // マナを10に設定
  }
  const playerPlanManaElement = document.getElementById('player-plan-mana');
  if (playerPlanManaElement) {
    playerPlanManaElement.textContent = String(player.plan_mana); // マナを10に設定
  }
  const playerLifeElement = document.getElementById('player-life');
  if (playerLifeElement) {
    playerLifeElement.textContent = String(player.life); // マナを10に設定
  }
}

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
  myPlayer: GameModels.Player | null,
  standbyFieldIndex: number,
  summon_phase_actions: GameModels.Action[],
) {
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

      console.log(`Monster ${summonedCard.card_name} has been summoned!`);
    }
  } else {
    console.error('Monster card not found in hand.');
  }
}

/**
 * 攻撃操作に合わせたオブジェクト側の操作
 * モンスターカードをフィールドの配列から消して、攻撃宣言をtrueにする。
 * @param uniq_id
 * @param myPlayer
 * @param activity_phase_actions
 * @returns
 */
export function planAttackMonster(
  uniq_id: string | null,
  myPlayer: GameModels.Player | null,
  activity_phase_actions: GameModels.Action[],
) {
  if (myPlayer === null) {
    console.error('Player not found.');
    return;
  }

  if (uniq_id === null) {
    console.error('uniq_id not found.');
    return;
  }

  const monster = myPlayer.plan_zone.standby_field.find(
    (card) => card?.uniq_id === uniq_id,
  );
  if (monster) {
    monster.can_act = false;
    monster.attack_declaration = true; //使用していないが攻撃宣言
  }

  if (monster && monster.card_type === GameModels.CardType.MONSTER) {
    activity_phase_actions.push({
      action_type: GameModels.ActionType.MONSTER_ATTACK,
      action_data: {
        monster_card: monster,
      },
    });

    console.log(`Monster ${monster.card_name} is planning an attack!`);
  } else {
    console.error(
      'Monster card not found in standby field or card is not a monster.',
    );
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
  extractedGameResponse: GameModels.GameStateResponse | null,
  gameResponse: GameModels.GameStateResponse | null,
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
    // 取得したデータをグローバル変数に保存
    gameResponse = data;
    if (extractedGameResponse === null) {
      extractedGameResponse = gameResponse;
      renderPlayerStatus(
        getPlayerByUserId(extractedGameResponse?.game_state, userId),
      );
    }
    renderBtField(true, data.game_state.player_1.plan_zone.battle_field);
    renderStandbyField(true, data.game_state.player_1.plan_zone.standby_field);
    return [extractedGameResponse, gameResponse];
  } catch (error) {
    console.error('Failed to fetch game state:', error);
    return null;
  }
}

export function moveCardsToBattleFieldFromStandby(
  extractedGameResponse: GameModels.GameStateResponse | null,
  myUserId: string,
) {
  let playerCardUniqId;
  let opponentCardUniqId;

  for (let i = 0; i < 5; i++) {
    const playerSzoneId = `player-szone-${i}`;
    const playerSzone = document.getElementById(playerSzoneId);
    const playerSzoneInnerElement = playerSzone?.firstElementChild;
    const playerBzoneId = `player-bzone-${i}`;
    const playerBzone = document.getElementById(playerBzoneId);
    const playerBzoneInnerElement = playerBzone?.firstElementChild;
    if (playerSzoneInnerElement && playerBzoneInnerElement) {
      playerCardUniqId = playerSzoneInnerElement.getAttribute('id');
      playerBzoneInnerElement.innerHTML = playerSzoneInnerElement.innerHTML;
      playerSzoneInnerElement.innerHTML = '';
      const player = getPlayerByUserId(
        extractedGameResponse?.game_state,
        myUserId,
      );
      if (player) {
        player.plan_zone.battle_field[i].card =
          player.plan_zone.standby_field[i];
      }
    }

    const opponentSzoneId = `opponent-szone-${i}`;
    const opponentSzone = document.getElementById(opponentSzoneId);
    const opponentSzoneInnerElement = opponentSzone?.firstElementChild;
    const opponentBzoneId = `opponent-bzone-${i}`;
    const opponentBzone = document.getElementById(opponentBzoneId);
    const opponentBzoneInnerElement = opponentBzone?.firstElementChild;
    if (opponentSzoneInnerElement && opponentBzoneInnerElement) {
      opponentCardUniqId = opponentSzoneInnerElement.getAttribute('id');
      opponentBzoneInnerElement.innerHTML = opponentSzoneInnerElement.innerHTML;
      opponentSzoneInnerElement.innerHTML = '';
      const opponent = getPlayerExcludingUserId(
        extractedGameResponse?.game_state,
        myUserId,
      );
      if (opponent) {
        opponent.plan_zone.battle_field[i].card =
          opponent.plan_zone.standby_field[i];
      }
    }
  }
}
