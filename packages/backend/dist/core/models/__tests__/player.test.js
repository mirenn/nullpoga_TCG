"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const player_1 = require("../player");
const phase_1 = require("../phase");
const action_1 = require("../action");
const card_1 = require("../card");
describe('Player', () => {
    let player;
    const initialDeck = Array.from({ length: 5 }, (_, i) => i + 1);
    const mockUserId = 'testUser';
    beforeEach(() => {
        player = new player_1.Player(initialDeck, mockUserId);
    });
    describe('初期化', () => {
        it('正しく初期化されること', () => {
            expect(player.life).toBe(20);
            expect(player.mana).toBe(0);
            expect(player.isFirstPlayer).toBe(false);
            expect(player.turnCount).toBe(0);
            expect(player.phase).toBe(phase_1.PhaseKind.SPELL_PHASE);
            expect(player.userId).toBe(mockUserId);
            expect(player.handCards).toHaveLength(0);
            expect(player.deckCards).toHaveLength(initialDeck.length);
            expect(player.deckCards[0].cardNo).toBe(initialDeck[0]);
        });
    });
    describe('nextTurnRefresh', () => {
        it('ターン開始時の処理が正しく行われること', () => {
            player.nextTurnRefresh();
            expect(player.turnCount).toBe(1);
            expect(player.mana).toBe(1);
            expect(player.phase).toBe(phase_1.PhaseKind.SPELL_PHASE);
            expect(player.spellPhaseActions).toHaveLength(0);
            expect(player.summonPhaseActions).toHaveLength(0);
            expect(player.activityPhaseActions).toHaveLength(0);
        });
    });
    describe('legalActions', () => {
        it('SPELL_PHASEで正しいアクションを返すこと', () => {
            player.phase = phase_1.PhaseKind.SPELL_PHASE;
            const actions = player.legalActions();
            expect(actions).toHaveLength(1);
            expect(actions[0].actionType).toBe(action_1.ActionType.SPELL_PHASE_END);
        });
        it('END_PHASEで空の配列を返すこと', () => {
            player.phase = phase_1.PhaseKind.END_PHASE;
            expect(player.legalActions()).toHaveLength(0);
        });
    });
    describe('monsterMove', () => {
        it('モンスターが正しく移動できること', () => {
            const monsterCard = new card_1.MonsterCard(1);
            player.zone.battleField[0].card = monsterCard;
            const moveAction = new action_1.Action(action_1.ActionType.MONSTER_MOVE, {
                fromIdx: 0,
                toIdx: 1
            });
            player.monsterMove(moveAction, player.zone);
            expect(player.zone.battleField[0].card).toBeNull();
            expect(player.zone.battleField[1].card).toBe(monsterCard);
        });
    });
    describe('selectPlanAction', () => {
        it('フェーズが正しく遷移すること', () => {
            player.selectPlanAction(new action_1.Action(action_1.ActionType.SPELL_PHASE_END));
            expect(player.phase).toBe(phase_1.PhaseKind.SUMMON_PHASE);
            player.selectPlanAction(new action_1.Action(action_1.ActionType.SUMMON_PHASE_END));
            expect(player.phase).toBe(phase_1.PhaseKind.ACTIVITY_PHASE);
            player.selectPlanAction(new action_1.Action(action_1.ActionType.ACTIVITY_PHASE_END));
            expect(player.phase).toBe(phase_1.PhaseKind.END_PHASE);
        });
    });
    describe('monsterAttacked', () => {
        it('モンスター同士の攻撃が正しく処理されること', () => {
            const attackerCard = new card_1.MonsterCard(1);
            const targetCard = new card_1.MonsterCard(2);
            const enemyZone = player.zone;
            enemyZone.battleField[0].card = attackerCard;
            player.zone.battleField[1].card = targetCard;
            const attackAction = new action_1.Action(action_1.ActionType.MONSTER_ATTACK, {
                attackerIdx: 0,
                targetIdx: 1
            });
            player.monsterAttacked(attackAction, enemyZone);
            expect(targetCard.life).toBe(1);
            expect(attackerCard.attackDeclaration).toBe(true);
        });
        it('プレイヤーへの直接攻撃が正しく処理されること', () => {
            const attackerCard = new card_1.MonsterCard(1);
            const enemyZone = player.zone;
            enemyZone.battleField[0].card = attackerCard;
            const attackAction = new action_1.Action(action_1.ActionType.MONSTER_ATTACK, {
                attackerIdx: 0,
                targetIdx: 1
            });
            const initialLife = player.life;
            player.monsterAttacked(attackAction, enemyZone);
            expect(player.life).toBe(initialLife - 1);
            expect(attackerCard.attackDeclaration).toBe(true);
        });
    });
});
//# sourceMappingURL=player.test.js.map