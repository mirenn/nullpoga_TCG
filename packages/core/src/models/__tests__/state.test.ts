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

    describe('executeFullTurn sequential history', () => {
        it('should record summon actions sequentially in separate history entries', () => {
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

            // step 1: player1 (first player) summon
            expect(turnHist[1].ActionDict[state['player1'].userId]).toBeDefined();
            expect(turnHist[1].State.player1.zone.standbyField[0]).not.toBeNull();
            // player2 is not yet summoned in step 1
            expect(turnHist[1].State.player2.zone.standbyField[2]).toBeNull();

            // step 2: player2 summon
            expect(turnHist[2].ActionDict[state['player2'].userId]).toBeDefined();
            expect(turnHist[2].State.player1.zone.standbyField[0]).not.toBeNull();
            // player2 is now summoned in step 2
            expect(turnHist[2].State.player2.zone.standbyField[2]).not.toBeNull();
        });
    });
});