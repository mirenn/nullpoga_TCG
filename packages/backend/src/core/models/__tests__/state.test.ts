import { State } from '../state';
import { Player } from '../player';
import { FieldStatus } from '../zone';

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
            expect(state['player1'].mana).toBe(10);
            expect(state['player2'].mana).toBe(10);
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
});