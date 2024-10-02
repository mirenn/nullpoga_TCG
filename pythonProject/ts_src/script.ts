import * as GameModels from './gameModels.js';

let gameState: GameModels.GameStateResponse | null = null; // グローバル変数として宣言

async function getGameState(
  userId: string,
): Promise<GameModels.GameStateResponse | null> {
  const url = `http://127.0.0.1:8000/test_game_state/${userId}`;

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
    gameState = data;
    renderMonsterCard(
      'player-bzone-1',
      data.game_state.player_1.zone.battle_field[0].card,
    );
    return data;
  } catch (error) {
    console.error('Failed to fetch game state:', error);
    return null;
  }
}

function renderMonsterCard(
  slotId: string,
  monster: GameModels.MonsterCard | null | undefined,
) {
  const slot = document.getElementById(slotId);

  if (slot && monster) {
    slot.innerHTML = '';

    const cardElement = document.createElement('div');
    cardElement.className = 'monster-card';
    cardElement.innerHTML = `
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

// 手札のカードを描画する関数
function renderHand(
  playerHand: (GameModels.MonsterCard | GameModels.SpellCard)[],
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
      cardElement.className = 'monster-card';
      cardElement.innerHTML = `
        <img src="${card.image_url}" alt="${card.card_name}" class="monster-image" />
        <h3>${card.card_name}</h3>
        <p>Attack: ${card.attack}</p>
        <p>Life: ${card.life}</p>
      `;
    }
    handContainer.appendChild(cardElement);
  });
}

document.getElementById('render-hand')?.addEventListener('click', () => {
  if (gameState) {
    renderHand(gameState.game_state.player_1.hand_cards); // gameState から手札データを渡す
  } else {
    console.error('Game state is not loaded yet');
  }
});

// // テスト用のモンスターカードデータ
// const exampleMonster: GameModels.MonsterCard = {
//   card_no: 1,
//   card_name: 'Fire Dragon',
//   attack: 5,
//   life: 6,
//   image_url: 'path/to/monster-image.png', // 画像のパスを指定
// };

//renderMonsterCard('slot-1', exampleMonster);
console.log('nagai test');

document.querySelector('.fetch-button')?.addEventListener('click', () => {
  getGameState('user_id_1');
});
