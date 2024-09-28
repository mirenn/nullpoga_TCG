import * as GameModels from './gameModels';

type GameStateResponse = {
  room_id: string;
  game_state: GameModels.State; // 実際の `state` の型に応じて定義を変更してください
};

async function getGameState(userId: string): Promise<GameStateResponse | null> {
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

    const data: GameStateResponse = await response.json();
    console.log('Game State:', data);
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
