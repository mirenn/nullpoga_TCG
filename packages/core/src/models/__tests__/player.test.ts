import { Player } from '../player';
import { PhaseKind } from '../phase';
import { Action, ActionType } from '../action';
import { MonsterCard } from '../card';

describe('Player', () => {
    let player: Player;
    const initialDeck = Array.from({ length: 5 }, (_, i) => i + 1);
    const mockUserId = 'testUser';

    beforeEach(() => {
        player = new Player(initialDeck, mockUserId);
    });

    describe('初期化', () => {
        it('正しく初期化されること', () => {
            expect(player.life).toBe(20);
            expect(player.mana).toBe(0);
            expect(player.isFirstPlayer).toBe(false);
            expect(player.turnCount).toBe(0);
            expect(player.phase).toBe(PhaseKind.SPELL_PHASE);
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
            expect(player.phase).toBe(PhaseKind.SPELL_PHASE);
            expect(player.spellPhaseActions).toHaveLength(0);
            expect(player.summonPhaseActions).toHaveLength(0);
            expect(player.activityPhaseActions).toHaveLength(0);
        });
    });

    describe('legalActions', () => {
        it('SPELL_PHASEで正しいアクションを返すこと', () => {
            player.phase = PhaseKind.SPELL_PHASE;
            const actions = player.legalActions();
            expect(actions).toHaveLength(1);
            expect(actions[0].actionType).toBe(ActionType.SPELL_PHASE_END);
        });

        it('END_PHASEで空の配列を返すこと', () => {
            player.phase = PhaseKind.END_PHASE;
            expect(player.legalActions()).toHaveLength(0);
        });

        it('ACTIVITY_PHASEで対面スロット（4 - attackerIdx）への攻撃アクションを生成すること', () => {
            player.phase = PhaseKind.ACTIVITY_PHASE;
            // スロット0（画面左端）とスロット4（画面右端）にモンスターを配置
            player.planZone.battleField[0].card = new MonsterCard(1);
            player.planZone.battleField[4].card = new MonsterCard(2);

            const actions = player.legalActions();
            const attackActions = actions.filter(a => a.actionType === ActionType.MONSTER_ATTACK);
            expect(attackActions).toHaveLength(2);

            // スロット0のモンスターは対面スロット4を攻撃
            const attackFrom0 = attackActions.find(a => a.actionData.attackerIdx === 0);
            expect(attackFrom0?.actionData.targetIdx).toBe(4);

            // スロット4のモンスターは対面スロット0を攻撃
            const attackFrom4 = attackActions.find(a => a.actionData.attackerIdx === 4);
            expect(attackFrom4?.actionData.targetIdx).toBe(0);
        });
    });

    describe('monsterMove', () => {
        it('モンスターが正しく移動できること', () => {
            // モンスターを配置
            const monsterCard = new MonsterCard(1);
            player.zone.battleField[0].card = monsterCard;

            const moveAction = new Action(ActionType.MONSTER_MOVE, {
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
            // SPELLフェーズ終了
            player.selectPlanAction(new Action(ActionType.SPELL_PHASE_END));
            expect(player.phase).toBe(PhaseKind.SUMMON_PHASE);

            // SUMMONフェーズ終了
            player.selectPlanAction(new Action(ActionType.SUMMON_PHASE_END));
            expect(player.phase).toBe(PhaseKind.ACTIVITY_PHASE);

            // ACTIVITYフェーズ終了
            player.selectPlanAction(new Action(ActionType.ACTIVITY_PHASE_END));
            expect(player.phase).toBe(PhaseKind.END_PHASE);
        });
    });

    describe('monsterAttacked', () => {
        it('モンスター同士の攻撃が正しく処理されること', () => {
            const attackerCard = new MonsterCard(1);
            const targetCard = new MonsterCard(2);
            
            // モンスターを配置
            const enemyZone = player.zone;
            enemyZone.battleField[0].card = attackerCard;
            player.zone.battleField[1].card = targetCard;

            const attackAction = new Action(ActionType.MONSTER_ATTACK, {
                attackerIdx: 0,
                targetIdx: 1
            });

            player.monsterAttacked(attackAction, enemyZone);

            expect(targetCard.life).toBe(1);
            expect(attackerCard.attackDeclaration).toBe(true);
        });

        it('プレイヤーへの直接攻撃が正しく処理されること', () => {
            const attackerCard = new MonsterCard(1);
            const enemyZone = player.zone;
            enemyZone.battleField[0].card = attackerCard;

            const attackAction = new Action(ActionType.MONSTER_ATTACK, {
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