import * as GameModels from './gameModels.js';

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

/**
 *
 * @param slotId 使うかどうか微妙
 * @param monster
 */
export function renderBtFieldMonsterCard(
  slotId: string,
  monster: GameModels.MonsterCard | null | undefined,
) {
  const slot = document.getElementById(slotId);

  if (slot && monster) {
    slot.innerHTML = '';

    const cardElement = document.createElement('div');
    cardElement.classList.add('card', 'monster-card');
    cardElement.id = `${monster.uniq_id}`;
    cardElement.innerHTML = `
        <div class="mana-cost">${monster.mana_cost}</div>
        <img src="${monster.image_url}" alt="${monster.card_name}" class="monster-image" />
        <h3>${monster.card_name}</h3>
        <p>Attack: ${monster.attack}</p>
        <p>Life: ${monster.life}</p>
      `;

    slot.appendChild(cardElement);
  } else {
    console.error(`Slot with ID ${slotId} not found.`);
  }
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
 * 召喚操作に合わせてオブジェクト操作
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
  const playerHand = myPlayer.hand_cards;
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
