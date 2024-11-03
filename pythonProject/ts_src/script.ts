import * as GameModels from './gameModels.js';
import * as GameUtils from './gameUtils.js';

window.debugValues = window.debugValues || {};

/**
 * ゲームのデータを管理する
 */
let extractedGameResponse: GameModels.GameStateResponse | null = null;
let gameResponse: GameModels.GameStateResponse | null = null; // グローバル変数として宣言
let myUserId = 'user_id_1';
let spell_phase_actions : GameModels.Action[] = [];
let summon_phase_actions: GameModels.Action[] = [];
let activity_phase_actions: GameModels.Action[] = [];

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
  document.getElementById('player-szone-0') as HTMLElement,
  document.getElementById('player-szone-1') as HTMLElement,
  document.getElementById('player-szone-2') as HTMLElement,
  document.getElementById('player-szone-3') as HTMLElement,
  document.getElementById('player-szone-4') as HTMLElement,
];


// #region 召喚ドラッグアンドドロップハイライト/////////////////////
// 各スロットに対してドロップイベントを設定
dropAreas.forEach((area) => {
  area.addEventListener('dragover', (event: DragEvent) => {
    event.preventDefault(); // ドロップを許可
  });

  area.addEventListener('drop', (event: DragEvent) => {
    event.preventDefault();

    // ドロップされたエリアのIDを取得
    const dropAreaId = (event.target as HTMLElement).id;
    console.log(`Dropped in area with ID: ${dropAreaId}`);

    // ドラッグされていた要素のIDを取得
    const draggedElementId = event.dataTransfer!.getData('text');
    console.log(`Dragged element ID: ${draggedElementId}`);

    // ドラッグされていた要素を取得
    const draggedElement = document.getElementById(draggedElementId);

    if (draggedElement) {
      const match = dropAreaId.match(/\d+$/); // 末尾の数字を正規表現で取得
      if (match) {
        const summonIndex = match[0];
        GameUtils.planSummonMonster(
          draggedElementId,
          GameUtils.getPlayerByUserId(
            extractedGameResponse?.game_state,
            myUserId,
          ),
          Number(summonIndex),
          summon_phase_actions,
        );

        // ドロップされた要素をドロップ先に追加
        area.appendChild(draggedElement);
      }
    }
    GameUtils.renderPlayerStatus(
      GameUtils.getPlayerByUserId(extractedGameResponse?.game_state, myUserId),
    );

    // 全てのスロットのハイライトを削除
    dropAreas.forEach((area) => {
      area.classList.remove('highlight');
    });
  });
});

// #endregion 召喚ドラッグアンドドロップハイライト/////////////////////

document.getElementById('render-hand')?.addEventListener('click', () => {
  if (extractedGameResponse) {
        // 型アサーションを使用して game_state が存在することを保証
        const gameState = (extractedGameResponse as GameModels.GameStateResponse).game_state;
    const myHandCds = GameUtils.getPlayerByUserId(
      gameState,
      myUserId,
    )?.hand_cards;
    if (myHandCds) {
      GameUtils.renderHand(myHandCds, dropAreas); // gameResponse から手札データを渡す
    }
  } else {
    console.error('Game state is not loaded yet');
  }
});

document.getElementById("get-game-state")?.addEventListener('click', async () => {
  const res = await GameUtils.getgameResponse(myUserId, extractedGameResponse, gameResponse);
  if(res){
    [extractedGameResponse, gameResponse] = res;
  }
});

document.getElementById('action-submit')?.addEventListener('click', ()=>{
  GameUtils.actionSubmit(myUserId,spell_phase_actions,summon_phase_actions,activity_phase_actions);
});

document.getElementById("summon-phase-end")?.addEventListener("click", ()=>{
  const monsterCards = document.querySelectorAll(".card-slot.battle-field .monster-card");
  // モンスターカードごとに処理
  monsterCards.forEach(function(card) {
    // 攻撃ボタンを取得
    const attackButton = card.querySelector(".attack-button");

    if (attackButton) {
      // 条件に応じてボタンの有効/無効を切り替える
      const canAttack = checkIfCanAttack(card); // 攻撃可能かどうかを判断する関数

      if (canAttack) {
        attackButton.removeAttribute("disabled");
      } else {
        attackButton.setAttribute("disabled", "true");// 攻撃できない場合はボタンを無効化
      }

      // ボタンクリック時の処理
      attackButton.addEventListener("click", function() {
        const monsterId = card.getAttribute("id");
        console.log(monsterId + " が攻撃を宣言しました");
        // ここで攻撃処理を追加（例：API呼び出しやゲームロジック処理）
        GameUtils.planAttackMonster(monsterId,
          GameUtils.getPlayerByUserId(
          extractedGameResponse?.game_state,
          myUserId,
        ), activity_phase_actions);
        // 攻撃後はボタンを無効化
        attackButton.setAttribute("disabled", "true");
      });
    }
  });
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

function checkIfCanAttack(card: Element){
  const uniq_id = card.getAttribute('id');
  const player = GameUtils.getPlayerByUserId(extractedGameResponse?.game_state, myUserId);
  const slot = player?.plan_zone.battle_field.find((slot) => slot.card?.uniq_id === uniq_id);
  if (slot) {
    return slot.card?.can_act;
  }
}