import { State, DECK_1, DECK_2 } from '../state';
import { Player } from '../player';
import { FieldStatus } from '../zone';
import { Action, ActionType } from '../action';
import { MonsterCard, SpellCard, instanceCard, CardType } from '../card';

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
            const p1Monster = state['player1'].handCards[0] as MonsterCard;
            const p2Monster = state['player2'].handCards[0] as MonsterCard;

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
            const p1MonsterA = state['player1'].handCards[0] as MonsterCard;
            const p1MonsterB = state['player1'].handCards[1] as MonsterCard;
            const p2Monster = state['player2'].handCards[0] as MonsterCard;

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
            const p1Monster = state['player1'].handCards[0] as MonsterCard;
            const p2Monster = state['player2'].handCards[0] as MonsterCard;

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

    describe('Spell Cards & Spell Phase', () => {
        it('should correctly initialize and clone SpellCard instances', () => {
            const spell101 = instanceCard(101) as SpellCard;
            expect(spell101.cardType).toBe(CardType.SPELL);
            expect(spell101.cardName).toBe('隕石落下');
            expect(spell101.manaCost).toBe(3);

            const cloned = spell101.clone();
            expect(cloned.cardNo).toBe(101);
            expect(cloned.uniqId).toBe(spell101.uniqId);
            expect(cloned).not.toBe(spell101);

            const dict = spell101.toDict();
            const fromDictSpell = SpellCard.fromDict(dict);
            expect(fromDictSpell.cardNo).toBe(101);
            expect(fromDictSpell.cardName).toBe('隕石落下');
            expect(fromDictSpell.manaCost).toBe(3);
        });

        it('should draw SpellCard from default decks DECK_1 and DECK_2', () => {
            expect(DECK_1.some(no => no >= 100)).toBe(true);
            expect(DECK_2.some(no => no >= 100)).toBe(true);

            // Verify player hands can contain SpellCard instances
            const p1 = new Player([...DECK_1], 'p1');
            p1.init();
            const spells = p1.handCards.filter(c => c instanceof SpellCard);
            expect(spells.length).toBeGreaterThan(0);
        });

        it('should execute Meteor Fall (101): damage monster if present, wilderness if empty', () => {
            const p1 = state['player1'];
            const p2 = state['player2'];
            p1.mana = 10;

            const enemyMonster = new MonsterCard(1);
            enemyMonster.life = 5;
            p2.zone.battleField[2].card = enemyMonster;

            const spellCard = instanceCard(101) as SpellCard;
            p1.handCards.push(spellCard);

            const meteorMonsterAction = new Action(ActionType.CAST_SPELL, {
                spellCard,
                targetIdx: 2,
                targetPlayerId: p2.userId,
            });

            state.executeFullTurn([], [], [], [], [meteorMonsterAction], []);

            // Monster should take 3 damage (5 - 3 = 2)
            expect(p2.zone.battleField[2].card?.life).toBe(2);
            expect(p1.mana).toBe(10 - 3 + 1); // 10 - 3 cost + 1 refresh

            // Now cast on empty slot 0 -> should become WILDERNESS
            const spellCard2 = instanceCard(101) as SpellCard;
            p1.handCards.push(spellCard2);
            p1.mana = 10;

            const meteorEmptyAction = new Action(ActionType.CAST_SPELL, {
                spellCard: spellCard2,
                targetIdx: 0,
                targetPlayerId: p2.userId,
            });

            state.executeFullTurn([], [], [], [], [meteorEmptyAction], []);
            expect(p2.zone.battleField[0].status).toBe(FieldStatus.WILDERNESS);
        });

        it('should execute Immovable Rock (102): spawn rock token on target empty slot', () => {
            const p1 = state['player1'];
            p1.mana = 5;

            const rockSpell = instanceCard(102) as SpellCard;
            p1.handCards.push(rockSpell);

            const rockAction = new Action(ActionType.CAST_SPELL, {
                spellCard: rockSpell,
                targetIdx: 1,
                targetPlayerId: p1.userId,
            });

            state.executeFullTurn([], [], [], [], [rockAction], []);

            const spawned = p1.zone.battleField[1].card;
            expect(spawned).not.toBeNull();
            expect(spawned?.cardNo).toBe(99);
            expect(spawned?.life).toBe(3);
            expect(spawned?.attack).toBe(0);
            expect(spawned?.canAct).toBe(false);
        });

        it('should execute Front-Back Swap (103): swap front battlefield monster with standby card', () => {
            const p1 = state['player1'];
            p1.mana = 5;

            const frontMonster = new MonsterCard(1);
            frontMonster.cardName = 'Front';
            const backMonster = new MonsterCard(2);
            backMonster.cardName = 'Back';

            p1.zone.battleField[3].card = frontMonster;
            p1.zone.standbyField[3] = backMonster;

            const swapSpell = instanceCard(103) as SpellCard;
            p1.handCards.push(swapSpell);

            const swapAction = new Action(ActionType.CAST_SPELL, {
                spellCard: swapSpell,
                targetIdx: 3,
                targetPlayerId: p1.userId,
            });

            state.executeFullTurn([], [], [], [], [swapAction], []);

            expect(p1.zone.battleField[3].card?.cardName).toBe('Back');
            expect(p1.zone.standbyField[3]?.cardName).toBe('Front');
        });

        it('should execute Flame Guardian (104): increase target monster life by 5', () => {
            const p1 = state['player1'];
            p1.mana = 5;

            const monster = new MonsterCard(1);
            monster.life = 3;
            p1.zone.battleField[0].card = monster;

            const guardianSpell = instanceCard(104) as SpellCard;
            p1.handCards.push(guardianSpell);

            const guardianAction = new Action(ActionType.CAST_SPELL, {
                spellCard: guardianSpell,
                targetIdx: 0,
                targetPlayerId: p1.userId,
            });

            state.executeFullTurn([], [], [], [], [guardianAction], []);

            expect(p1.zone.battleField[0].card?.life).toBe(8);
        });

        it('should execute Summoning Ritual (105): summon cost <= 3 monster from hand to battlefield', () => {
            const p1 = state['player1'];
            p1.mana = 5;

            const handMonster = new MonsterCard(1);
            handMonster.manaCost = 2;
            handMonster.cardName = 'RitualMonster';
            p1.handCards = [handMonster];

            const ritualSpell = instanceCard(105) as SpellCard;
            p1.handCards.push(ritualSpell);

            const ritualAction = new Action(ActionType.CAST_SPELL, {
                spellCard: ritualSpell,
                targetIdx: 0,
                targetPlayerId: p1.userId,
            });

            state.executeFullTurn([], [], [], [], [ritualAction], []);

            const battlefieldCards = p1.zone.battleField.map(s => s.card?.cardName).filter(Boolean);
            expect(battlefieldCards).toContain('RitualMonster');
        });

        it('should execute Blazing Spell (106): 1 damage to all enemy battlefield monsters', () => {
            const p1 = state['player1'];
            const p2 = state['player2'];
            p1.mana = 5;

            const m1 = new MonsterCard(1);
            m1.life = 3;
            const m2 = new MonsterCard(2);
            m2.life = 1; // will be deleted!

            p2.zone.battleField[0].card = m1;
            p2.zone.battleField[4].card = m2;

            const blazeSpell = instanceCard(106) as SpellCard;
            p1.handCards.push(blazeSpell);

            const blazeAction = new Action(ActionType.CAST_SPELL, {
                spellCard: blazeSpell,
            });

            state.executeFullTurn([], [], [], [], [blazeAction], []);

            expect(p2.zone.battleField[0].card?.life).toBe(2);
            expect(p2.zone.battleField[4].card).toBeNull(); // defeated and removed
        });

        it('should execute Fire Rain (107): 3 damage to 3 battlefield slots', () => {
            const p1 = state['player1'];
            const p2 = state['player2'];
            p1.mana = 5;

            const m = new MonsterCard(1);
            m.life = 5;
            p2.zone.battleField[0].card = m;

            const rainSpell = instanceCard(107) as SpellCard;
            p1.handCards.push(rainSpell);

            const rainAction = new Action(ActionType.CAST_SPELL, {
                spellCard: rainSpell,
                targetIdx: 0,
            });

            state.executeFullTurn([], [], [], [], [rainAction], []);

            // Target slot 0 is affected by targetIndices [0%5, 1%5, 3%5]
            expect(p2.zone.battleField[0].card?.life).toBe(2);
        });

        it('should resolve spells in order of ascending cardNo', () => {
            const p1 = state['player1'];
            const p2 = state['player2'];
            p1.mana = 10;
            p2.mana = 10;

            // p1 casts card 106 (烈火の呪文), p2 casts card 102 (不動の岩)
            const p1Spell = instanceCard(106) as SpellCard;
            const p2Spell = instanceCard(102) as SpellCard;

            p1.handCards.push(p1Spell);
            p2.handCards.push(p2Spell);

            const p1Act = new Action(ActionType.CAST_SPELL, {
                spellCard: p1Spell,
            });
            const p2Act = new Action(ActionType.CAST_SPELL, {
                spellCard: p2Spell,
                targetIdx: 2,
                targetPlayerId: p2.userId,
            });

            state.executeFullTurn([], [], [], [], [p1Act], [p2Act]);

            const turnHist = state['history'][0];
            const spellSteps = turnHist.filter(s => {
                const acts = Object.values(s.ActionDict) as any[];
                return acts.some(a => a?.actionType === ActionType.CAST_SPELL);
            });

            // Card 102 (p2) resolves first, then card 106 (p1)
            expect(spellSteps.length).toBe(2);
            expect(spellSteps[0].ActionDict[p2.userId]?.actionData?.spellCard?.cardNo).toBe(102);
            expect(spellSteps[1].ActionDict[p1.userId]?.actionData?.spellCard?.cardNo).toBe(106);

            // Rock (HP 3) was spawned by p2 (102), then damaged by p1's 106 -> HP 2
            expect(p2.zone.battleField[2].card?.cardNo).toBe(99);
            expect(p2.zone.battleField[2].card?.life).toBe(2);
        });

        it('should detect fizzle when identical spells are cast on conflicting targets', () => {
            const p1 = state['player1'];
            const p2 = state['player2'];
            p1.mana = 10;
            p2.mana = 10;

            const m = new MonsterCard(1);
            m.cardName = 'ネズミ';
            m.life = 1;
            // Place mouse on p2's battle slot 4 (which faces p1's slot 0)
            p2.zone.battleField[4].card = m;

            // Both players cast Front-Back Swap (103) conflicting on p2's slot 4:
            // p1 pulls from opponent battle slot (targetZone: 'OPPONENT_BATTLE', targetIdx: 0)
            // p2 swaps own front and back (targetIdx: 4)
            const spell1 = instanceCard(103) as SpellCard;
            const spell2 = instanceCard(103) as SpellCard;

            p1.handCards.push(spell1);
            p2.handCards.push(spell2);

            const p1Act = new Action(ActionType.CAST_SPELL, {
                spellCard: spell1,
                targetIdx: 0,
                targetZone: 'OPPONENT_BATTLE',
            });
            const p2Act = new Action(ActionType.CAST_SPELL, {
                spellCard: spell2,
                targetIdx: 4,
                targetPlayerId: p2.userId,
            });

            state.executeFullTurn([], [], [], [], [p1Act], [p2Act]);

            const turnHist = state['history'][0];
            const fizzleStep = turnHist.find(s => {
                const act1 = s.ActionDict[p1.userId];
                const act2 = s.ActionDict[p2.userId];
                return act1?.actionData?.fizzled && act2?.actionData?.fizzled;
            });

            expect(fizzleStep).toBeDefined();
            // In fizzle, monster did not move
            expect(p2.zone.battleField[4].card?.cardName).toBe('ネズミ');
            expect(p1.zone.battleField[0].card).toBeNull();
            expect(p2.zone.standbyField[4]).toBeNull();
            // But mana was consumed (cost 7): 10 - 7 + 1 = 4
            expect(p1.mana).toBe(10 - 7 + 1);
            expect(p2.mana).toBe(10 - 7 + 1);
        });
    });
});