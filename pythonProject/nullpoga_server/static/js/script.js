var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var _a;
function getGameState(userId) {
    return __awaiter(this, void 0, void 0, function* () {
        const url = `http://127.0.0.1:8000/test_game_state/${userId}`;
        try {
            const response = yield fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            if (!response.ok) {
                throw new Error(`Error: ${response.status}`);
            }
            const data = yield response.json();
            console.log('Game State:', data);
            renderMonsterCard('player-bzone-1', data.game_state.player_1.zone.battle_field[0].card);
            return data;
        }
        catch (error) {
            console.error('Failed to fetch game state:', error);
            return null;
        }
    });
}
function renderMonsterCard(slotId, monster) {
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
    }
    else {
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
(_a = document.querySelector('.fetch-button')) === null || _a === void 0 ? void 0 : _a.addEventListener('click', () => {
    getGameState('user_id_1');
});
export {};
