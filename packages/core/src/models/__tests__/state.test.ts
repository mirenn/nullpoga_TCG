import { State } from '../state';
import { Player } from '../player';
import { FieldStatus } from '../zone';
import { Action, ActionType } from '../action';

describe('State', () => {
    let state: State;

    beforeEach(() => {
        state = new State();
        state.initGame();
    });

    describe('initGame', () => {
        it('should initialize the game state correctly', () => {
            const state = new State();
            state.initGame();

            // Test first player flags
            expect(state['player1'].isFirstPlayer).toBe(true);
            expect(state['player2'].isFirstPlayer).toBe(false);

            // Test initial hand size
            expect(state['player1'].handCards.length).toBe(5);
            expect(state['player2'].handCards.length).toBe(5);

            // Test initial mana
            expect(state['player1'].mana).toBe(1);
            expect(state['player2'].mana).toBe(1);
        });
    });

    describe('isGameEnd', () => {
        it('should return true when all battleField slots are wilderness', () => {
            // Set all battlefield slots to wilderness for player1
            state['player1'].zone.battleField.forEach(slot => {
                slot.status = FieldStatus.WILDERNESS;
            });

            expect(state.isGameEnd()).toBe(true);
        });

        it("should return true when a player's life is 0 or below", () => {
            state['player1'].life = 0;
            expect(state.isGameEnd()).toBe(true);
        });

        it("should return true when both players' decks are empty", () => {
            state['player1'].deckCards = [];
            state['player2'].deckCards = [];
            expect(state.isGameEnd()).toBe(true);
        });
    });

    describe('executeFullTurn simultaneous summon history', () => {
        it('should record both players 1st summon actions simultaneously in the same history entry', () => {
            const p1Card = state['player1'].handCards[0];
            const p2Card = state['player2'].handCards[0];

            // コスト1のカードを用意
            p1Card.manaCost = 1;
            p2Card.manaCost = 1;

            const p1Summon = [new Action(ActionType.SUMMON_MONSTER, {
                monsterCard: p1Card,
                summonStandbyFieldIdx: 0,
            })];

            const p2Summon = [new Action(ActionType.SUMMON_MONSTER, {
                monsterCard: p2Card,
                summonStandbyFieldIdx: 2,
            })];

            state.executeFullTurn(p1Summon as any, [], p2Summon as any, []);

            const turnHist = state['history'][0];
            expect(turnHist).toBeDefined();
            // step 0: TURN_START_SNAPSHOT
            expect(turnHist[0].ActionDict.system?.actionType).toBe('TURN_START_SNAPSHOT');
            expect(turnHist[0].State.player1.zone.standbyField[0]).toBeNull();
            expect(turnHist[0].State.player2.zone.standbyField[2]).toBeNull();

            // step 1: Both player1 and player2 summon simultaneously
            expect(turnHist.length).toBe(2); // snapshot + 1 simultaneous summon step
            expect(turnHist[1].ActionDict[state['player1'].userId]).toBeDefined();
            expect(turnHist[1].ActionDict[state['player2'].userId]).toBeDefined();
            expect(turnHist[1].State.player1.zone.standbyField[0]).not.toBeNull();
            expect(turnHist[1].State.player2.zone.standbyField[2]).not.toBeNull();

            // ターン2: 待機フィールドのカードが前進（進軍）する
            state.executeFullTurn([], [], [], []);
            const turn2Hist = state['history'][1];
            expect(turn2Hist).toBeDefined();

            // step 0: ターン開始スナップショット（進軍前なので待機フィールドにカードがある）
            expect(turn2Hist[0].ActionDict.system?.actionType).toBe('TURN_START_SNAPSHOT');
            expect(turn2Hist[0].State.player1.zone.standbyField[0]).not.toBeNull();
            expect(turn2Hist[0].State.player2.zone.standbyField[2]).not.toBeNull();

            // step 1: player1 の進軍アクション (MONSTER_ADVANCE)
            const advanceStep1 = turn2Hist.find(step => {
                const act = step.ActionDict[state['player1'].userId];
                return act?.actionType === ActionType.MONSTER_ADVANCE;
            });
            expect(advanceStep1).toBeDefined();
            expect(advanceStep1!.ActionDict[state['player1'].userId].actionData.fromStandbyIdx).toBe(0);
            expect(advanceStep1!.ActionDict[state['player1'].userId].actionData.toBattleIdx).toBe(0);

            // step 2: player2 の進軍アクション (MONSTER_ADVANCE)
            const advanceStep2 = turn2Hist.find(step => {
                const act = step.ActionDict[state['player2'].userId];
                return act?.actionType === ActionType.MONSTER_ADVANCE;
            });
            expect(advanceStep2).toBeDefined();
            expect(advanceStep2!.ActionDict[state['player2'].userId].actionData.fromStandbyIdx).toBe(2);
            expect(advanceStep2!.ActionDict[state['player2'].userId].actionData.toBattleIdx).toBe(2);
        });
    });

    describe('executeFullTurn simultaneous attack history', () => {
        it('should record both players 1st attack actions simultaneously in the same history entry and resolve mutual damage', () => {
            const p1Monster = state['player1'].handCards[0];
            const p2Monster = state['player2'].handCards[0];

            p1Monster.attack = 2;
            p1Monster.life = 2;
            p2Monster.attack = 2;
            p2Monster.life = 2;

            // バトルフィールドに直接配置
            state['player1'].zone.battleField[2].card = p1Monster;
            state['player2'].zone.battleField[2].card = p2Monster;

            // お互いに対面（4 - 2 = 2）を攻撃
            const p1Attack = new Action(ActionType.MONSTER_ATTACK, {
                attackerIdx: 2,
                targetIdx: 2,
                monsterCard: p1Monster,
            });
            const p2Attack = new Action(ActionType.MONSTER_ATTACK, {
                attackerIdx: 2,
                targetIdx: 2,
                monsterCard: p2Monster,
            });

            state.executeFullTurn([], [p1Attack], [], [p2Attack]);

            const turnHist = state['history'][0];
            expect(turnHist).toBeDefined();

            // 攻撃ステップ（両プレイヤーのアクションが1つのステップに同居）
            const attackStep = turnHist.find(step => {
                return (
                    step.ActionDict[state['player1'].userId]?.actionType === ActionType.MONSTER_ATTACK &&
                    step.ActionDict[state['player2'].userId]?.actionType === ActionType.MONSTER_ATTACK
                );
            });
            expect(attackStep).toBeDefined();

            // 相打ちにより、両モンスターのライフが0になりフィールドから削除されること
            expect(state['player1'].zone.battleField[2].card).toBeNull();
            expect(state['player2'].zone.battleField[2].card).toBeNull();
        });

        it('should process simultaneous clash in step 1, and subsequent independent attack in step 2', () => {
            const p1MonsterA = state['player1'].handCards[0];
            const p1MonsterB = state['player1'].handCards[1];
            const p2Monster = state['player2'].handCards[0];

            p1MonsterA.attack = 2;
            p1MonsterA.life = 3;
            p1MonsterB.attack = 1;
            p1MonsterB.life = 2;
            p2Monster.attack = 1;
            p2Monster.life = 2;

            state['player1'].zone.battleField[1].card = p1MonsterA;
            state['player1'].zone.battleField[3].card = p1MonsterB;
            state['player2'].zone.battleField[3].card = p2Monster; // 4 - 1 = 3 (対面はスロット1)

            // p1: 1体目（スロット1）が対面（スロット3のp2Monster）攻撃、2体目（スロット3）が対面（スロット1の空き）攻撃
            const p1Act1 = new Action(ActionType.MONSTER_ATTACK, {
                attackerIdx: 1,
                targetIdx: 3,
                monsterCard: p1MonsterA,
            });
            const p1Act2 = new Action(ActionType.MONSTER_ATTACK, {
                attackerIdx: 3,
                targetIdx: 1,
                monsterCard: p1MonsterB,
            });

            // p2: 1体目（スロット3）が対面（スロット1のp1MonsterA）攻撃
            const p2Act1 = new Action(ActionType.MONSTER_ATTACK, {
                attackerIdx: 3,
                targetIdx: 1,
                monsterCard: p2Monster,
            });

            const initialP2Life = state['player2'].life;

            state.executeFullTurn([], [p1Act1, p1Act2], [], [p2Act1]);

            const turnHist = state['history'][0];
            expect(turnHist).toBeDefined();

            // ステップ1: 同時攻撃（p1Act1 と p2Act1）
            const clashStep = turnHist.find(step => {
                return (
                    step.ActionDict[state['player1'].userId]?.actionType === ActionType.MONSTER_ATTACK &&
                    step.ActionDict[state['player2'].userId]?.actionType === ActionType.MONSTER_ATTACK
                );
            });
            expect(clashStep).toBeDefined();

            // p2Monsterは攻撃力2を受けて撃破、p1MonsterAは攻撃力1を受けて残ライフ2で生存
            expect(state['player2'].zone.battleField[3].card).toBeNull();
            expect(state['player1'].zone.battleField[1].card).not.toBeNull();
            expect(state['player1'].zone.battleField[1].card?.life).toBe(2);

            // ステップ2: p1Act2 単独攻撃（ダイレクトアタック）
            const directAttackStep = turnHist.find(step => {
                return (
                    step.ActionDict[state['player1'].userId]?.actionType === ActionType.MONSTER_ATTACK &&
                    step.ActionDict[state['player2'].userId] === undefined
                );
            });
            expect(directAttackStep).toBeDefined();
            // ダイレクトアタックにより相手のライフが減少
            expect(state['player2'].life).toBe(initialP2Life - 1);
            // 対面スロットが荒野化
            expect(state['player2'].zone.battleField[1].status).toBe(FieldStatus.WILDERNESS);
        });

        it('should not allow a monster destroyed in step 1 to attack in step 2', () => {
            const p1Monster = state['player1'].handCards[0];
            const p2Monster = state['player2'].handCards[0];

            p1Monster.attack = 3;
            p1Monster.life = 3;
            p2Monster.attack = 1;
            p2Monster.life = 2; // p1の攻撃で1撃死する

            state['player1'].zone.battleField[2].card = p1Monster;
            state['player2'].zone.battleField[2].card = p2Monster;

            const p1Act1 = new Action(ActionType.MONSTER_ATTACK, {
                attackerIdx: 2,
                targetIdx: 2,
                monsterCard: p1Monster,
            });

            // p2Monster がステップ2で攻撃しようとする計画
            const p2Act2 = new Action(ActionType.MONSTER_ATTACK, {
                attackerIdx: 2,
                targetIdx: 2,
                monsterCard: p2Monster,
            });

            state.executeFullTurn([], [p1Act1], [], [undefined as any, p2Act2]);

            const turnHist = state['history'][0];
            // ステップ2にp2Monsterの攻撃は記録されないこと
            const step2 = turnHist.find(step => {
                return step.ActionDict[state['player2'].userId]?.actionType === ActionType.MONSTER_ATTACK;
            });
            expect(step2).toBeUndefined();
        });
    });
});