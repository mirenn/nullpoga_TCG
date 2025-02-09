"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const state_1 = require("../state");
const zone_1 = require("../zone");
describe('State', () => {
    let state;
    beforeEach(() => {
        state = new state_1.State();
        state.initGame();
    });
    describe('initGame', () => {
        it('should initialize the game state correctly', () => {
            const state = new state_1.State();
            state.initGame();
            expect(state['player1'].isFirstPlayer).toBe(true);
            expect(state['player2'].isFirstPlayer).toBe(false);
            expect(state['player1'].handCards.length).toBe(5);
            expect(state['player2'].handCards.length).toBe(5);
            expect(state['player1'].mana).toBe(10);
            expect(state['player2'].mana).toBe(10);
        });
    });
    describe('isGameEnd', () => {
        it('should return true when all battleField slots are wilderness', () => {
            state['player1'].zone.battleField.forEach(slot => {
                slot.status = zone_1.FieldStatus.WILDERNESS;
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
});
//# sourceMappingURL=state.test.js.map