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
});