var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var _a, _b;
import * as GameUtils from './gameUtils.js';
window.debugValues = window.debugValues || {};
/**
 * ゲームのデータを管理する
 */
let extractedGameResponse = null;
let gameResponse = null; // グローバル変数として宣言
let myUserId = 'user_id_1';
let spell_phase_actions = [];
let summon_phase_actions = [];
let activity_phase_actions = [];
//#region デバッグ用にglobalにセット
window.debugValues = {
    get extractedGameResponse() {
        return extractedGameResponse;
    },
    get summon_phase_actions() {
        return summon_phase_actions;
    },
    get activity_phase_actions() {
        return activity_phase_actions;
    },
};
//#endregion
const dropAreas = [
    document.getElementById('player-szone-0'),
    document.getElementById('player-szone-1'),
    document.getElementById('player-szone-2'),
    document.getElementById('player-szone-3'),
    document.getElementById('player-szone-4'),
];
function getgameResponse(userId) {
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
            // 取得したデータをグローバル変数に保存
            gameResponse = data;
            if (extractedGameResponse === null) {
                extractedGameResponse = gameResponse;
                GameUtils.renderPlayerStatus(GameUtils.getPlayerByUserId(extractedGameResponse === null || extractedGameResponse === void 0 ? void 0 : extractedGameResponse.game_state, myUserId));
            }
            GameUtils.renderBtFieldMonsterCard('player-bzone-1', data.game_state.player_1.zone.battle_field[0].card);
            return data;
        }
        catch (error) {
            console.error('Failed to fetch game state:', error);
            return null;
        }
    });
}
// #region 召喚ドラッグアンドドロップハイライト/////////////////////
// 各スロットに対してドロップイベントを設定
dropAreas.forEach((area) => {
    area.addEventListener('dragover', (event) => {
        event.preventDefault(); // ドロップを許可
    });
    area.addEventListener('drop', (event) => {
        event.preventDefault();
        // ドロップされたエリアのIDを取得
        const dropAreaId = event.target.id;
        console.log(`Dropped in area with ID: ${dropAreaId}`);
        // ドラッグされていた要素のIDを取得
        const draggedElementId = event.dataTransfer.getData('text');
        console.log(`Dragged element ID: ${draggedElementId}`);
        // ドラッグされていた要素を取得
        const draggedElement = document.getElementById(draggedElementId);
        if (draggedElement) {
            const match = dropAreaId.match(/\d+$/); // 末尾の数字を正規表現で取得
            if (match) {
                const summonIndex = match[0];
                GameUtils.planSummonMonster(draggedElementId, GameUtils.getPlayerByUserId(extractedGameResponse === null || extractedGameResponse === void 0 ? void 0 : extractedGameResponse.game_state, myUserId), Number(summonIndex), summon_phase_actions);
                // ドロップされた要素をドロップ先に追加
                area.appendChild(draggedElement);
            }
        }
        GameUtils.renderPlayerStatus(GameUtils.getPlayerByUserId(extractedGameResponse === null || extractedGameResponse === void 0 ? void 0 : extractedGameResponse.game_state, myUserId));
        // 全てのスロットのハイライトを削除
        dropAreas.forEach((area) => {
            area.classList.remove('highlight');
        });
    });
});
// #endregion 召喚ドラッグアンドドロップハイライト/////////////////////
(_a = document.getElementById('render-hand')) === null || _a === void 0 ? void 0 : _a.addEventListener('click', () => {
    var _a;
    if (extractedGameResponse) {
        const myHandCds = (_a = GameUtils.getPlayerByUserId(extractedGameResponse.game_state, myUserId)) === null || _a === void 0 ? void 0 : _a.hand_cards;
        if (myHandCds) {
            GameUtils.renderHand(myHandCds, dropAreas); // gameResponse から手札データを渡す
        }
    }
    else {
        console.error('Game state is not loaded yet');
    }
});
(_b = document.querySelector('.fetch-button')) === null || _b === void 0 ? void 0 : _b.addEventListener('click', () => {
    getgameResponse('user_id_1');
});
// // テスト用のモンスターカードデータ
// const exampleMonster: GameModels.MonsterCard = {
//   card_no: 1,
//   card_name: 'Fire Dragon',
//   attack: 5,
//   life: 6,
//   image_url: 'path/to/monster-image.png', // 画像のパスを指定
// };
//renderBtFieldMonsterCard('slot-1', exampleMonster);
