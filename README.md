# Nullpoga TCG (ヌルポガ TCG)

> A simultaneous-decision, simultaneous-execution digital collectible card game.

## Core Rules

- **Simultaneous Turns**: Both players plan actions concurrently without knowing the opponent's moves. Planned actions are submitted to the server and executed deterministically in phase order.
- **Mana System**: Standard progression. Available mana increases by +1 each turn. Starts at 1, capped at 10.
- **Board / Zones**:
  - 5 columns across the board.
  - ![zone.png](%E3%83%86%E3%82%99%E3%82%B7%E3%82%99%E3%82%BF%E3%83%AB%E3%82%AB%E3%83%BC%E3%83%88%E3%82%99%E3%82%B1%E3%82%99%E3%83%BC%E3%83%A0%E3%80%8C%E3%83%8C%E3%83%AB%E3%83%9B%E3%82%9A%E3%82%AB%E3%82%99%E3%80%8D%201955a0bf5d894d4788fa4f70df5c7497/zone.png)
  - **Standby Zone (スタンバイゾーン)**: Where monsters are initially summoned.
  - **Battle Zone (バトルゾーン)**: Where monsters advance and perform actions (move/attack).
- **Turn Phases**:
  Each turn consists of three main phases planned concurrently:
  1. **Spell Phase (スペルフェイズ)**: Cast spell cards.
  2. **March/Summon Phase (進軍召喚フェイズ)**: Summon monsters to Standby Zone. Monsters already in Standby Zone advance (march) to Battle Zone. Newly summoned monsters do not march on the turn they are summoned; they march next turn.
  3. **Activity Phase (行動フェイズ)**: Battle Zone monsters act. Split into two sequential sub-steps:
     - **Movement Step**: Monsters can move to an adjacent empty column (left or right).
     - **Attack Step**: Monsters attack forward.
     - Actions resolve in declared sequence.
     - Examples:
       ![activity_plan.png](%E3%83%86%E3%82%99%E3%82%B7%E3%82%99%E3%82%BF%E3%83%AB%E3%82%AB%E3%83%BC%E3%83%88%E3%82%99%E3%82%B1%E3%82%99%E3%83%BC%E3%83%A0%E3%80%8C%E3%83%8C%E3%83%AB%E3%83%9B%E3%82%9A%E3%82%AB%E3%82%99%E3%80%8D%201955a0bf5d894d4788fa4f70df5c7497/activity_plan.png)
       ![activity_1.png](%E3%83%86%E3%82%99%E3%82%B7%E3%82%99%E3%82%BF%E3%83%AB%E3%82%AB%E3%83%BC%E3%83%88%E3%82%99%E3%82%B1%E3%82%99%E3%83%BC%E3%83%A0%E3%80%8C%E3%83%8C%E3%83%AB%E3%83%9B%E3%82%9A%E3%82%AB%E3%82%99%E3%80%8D%201955a0bf5d894d4788fa4f70df5c7497/activity_1.png)
       ![activity_2.png](%E3%83%86%E3%82%99%E3%82%B7%E3%82%99%E3%82%BF%E3%83%AB%E3%82%AB%E3%83%BC%E3%83%88%E3%82%99%E3%82%B1%E3%82%99%E3%83%BC%E3%83%A0%E3%80%8C%E3%83%8C%E3%83%AB%E3%83%9B%E3%82%9A%E3%82%AB%E3%82%99%E3%80%8D%201955a0bf5d894d4788fa4f70df5c7497/activity_2.png)
       ![activity_3.png](%E3%83%86%E3%82%99%E3%82%B7%E3%82%99%E3%82%BF%E3%83%AB%E3%82%AB%E3%83%BC%E3%83%88%E3%82%99%E3%82%B1%E3%82%99%E3%83%BC%E3%83%A0%E3%80%8C%E3%83%8C%E3%83%AB%E3%83%9B%E3%82%9A%E3%82%AB%E3%82%99%E3%80%8D%201955a0bf5d894d4788fa4f70df5c7497/activity_3.png)
- **Victory Conditions**:
  - Reduce opponent's Life (20) to <= 0.
  - Turn 4 consecutive Battle Zones of the opponent into Wilderness (荒野状態).
    - When a monster attacks and no enemy monster faces it in the opposing Battle Zone, direct damage equal to Attack is dealt to the player and that Battle Zone turns into Wilderness.
  - If both satisfy victory conditions simultaneously, the player with higher remaining Life wins (Life can be negative). If equal, it's a draw.

## Deck & Card Specifications

- **Deck Size**: 30 cards. Max 2 copies of identical cards.
- **Draw**: Initial hand of 5 cards. Draw 1 card per turn.
- [Google Spreadsheet Card List](https://docs.google.com/spreadsheets/d/e/2PACX-1vThBi5yGqPFNrDPT00hie3CD4JGQ6Qx71EwTzj8FgZzrGZuejdW0tBbDFIx67aUr9NlhRa1gYO8xvAu/pubhtml)

### Spell Cards

- **Meteor Fall (隕石落下)**:
  - Cost: 3. Deals 3 damage to a monster in the specified zone. If the zone is a Battle Zone and empty, turns it into Wilderness. Does not damage player directly.
- **Immovable Rock (不動の岩)**:
  - Cost: 3. Places an Immovable Rock (Atk: 0, Life: 3) in an empty specified Battle Zone (can target opponent's zone). Has no valid actions in Activity Phase. Nerf: Life -1 at turn start.
- **Front-Back Swap (前後交換)**:
  - Cost: 7. Swaps the two vertical slots at the specified column. Can pull an enemy monster to own side.
- **Flame Guardian (炎の守護)**:
  - Cost: 4. Target 1 friendly monster; it becomes invincible until next turn.
- **Summoning Ritual (召喚の儀式)**:
  - Cost: 3. Summons a monster with mana cost <= 3 directly from hand into Battle Zone.
- **Blazing Spell (烈火の呪文)**:
  - Cost: 5. Deals 1 damage to all enemy monsters in Battle Zone and applies Burn (take 1 damage at next turn start).
- **Fire Rain (火の雨)**:
  - Cost: 6. Strikes 3 random Battle Zones; deals 3 damage to all monsters in each targeted zone.

### Monster Cards

| Name | Code Name | Cost | Atk | Life | Effect |
|------|-----------|------|-----|------|--------|
| Mouse | ネズミ | 1 | 1 | 1 | - |
| Shiba Inu Ranmaru | 柴犬ラン丸 | 2 | 1 (or 2) | 2 (or 1) | Attack +1 whenever it moves |
| Cat | ネコ | 1 | 2 | 2 | - |
| Frog Private | カエル三等兵 | 0 (or 2) | 1 | 2 | Grows at turn start: T1 +1 Life, T2 +1 Atk, T3 +1 Atk & +1 Life |
| Turtle | 亀 (亀吉) | 0 (or 2) | 4 (or 0) | 2 (or 4) | High durability tank |
| Electric Jellyfish | 電気クラゲ | 1 (or 2) | 1 | 2 (or 1) | Inflicts Stun (cannot act next turn) on attacked enemy |
| Boar | イノシシ | 3 | 2 (or 3) | 3 (or 2) | - |
| Neighboring Stoat | となりのオコジョ | 3 | 1 | 2 | Attacks forward and forward-right simultaneously |
| Wyvern | ワイバーン | 4 | 4 | 2 | - |
| Pisces Archer | うお座の射手 | 4 | 2 | 2 | Can attack any chosen Battle Zone |
| Fire Dragon | 炎のドラゴン | 5 | 6 | 7 | On marching into Battle Zone, deals 2 damage to all adjacent enemy monsters |
| Ulvan | ウルヴァン | 8 | 8 | 8 | High-stat powerhouse |
| Frost Witch | 氷の魔導士「フロストウィッチ」 | 5 | 3 | 4 | Freezes a chosen enemy monster at activity phase start |
| Thunder Colossus | 雷の巨人「サンダーコロッサス」 | 8 | 4 | 7 | Deals 3 damage to a random enemy monster at turn start |
| Gaia Beast | 大地の守護者「ガイアビースト」 | 6 | 2 | 7 | Gains +1 Atk for each 1 damage taken |
| Nightmare Lord | 闇の召喚者「ナイトメアロード」 | 6 | 4 | 5 | Summons two Nightmare Tokens (1/1) on summon |
| Tempest Knight | 風の戦士「テンペストナイト」 | 5 | 3 | 4 | Moves an enemy monster to an empty Battle Zone |
| Seraphim | 聖なる天使「セラフィム」 | 6 | 2 | 6 | Heals all allies for 2 at activity phase end |
| Venom Snake | 毒の蛇「ヴェノムスネーク」 | 4 | 3 | 3 | Inflicts Poison for 2 turns on hit |
| Mecha Golem | 機械のゴーレム「メカゴーレム」 | 7 | 5 | 5 | Doubles Atk of a random ally for 2 turns on summon |
| Chrono Mage | 時間の操り師「クロノメイジ」 | 5 | 2 | 4 | Repeats one chosen phase |

## Spell Execution Engine Specifications

- **Spell Phase Subdivisions**:
  - The Spell Phase is evaluated in sequential sub-phases: Spell Phase 1, Spell Phase 2, ... Spell Phase N.
  - If Player A casts Meteor Fall & Immovable Rock, and Player B casts Meteor Fall:
    - *Sub-phase 1*: Both Meteor Falls resolve.
    - *Sub-phase 2*: Player A's Immovable Rock resolves.
- **Spell Priority (Speed)**:
  - Spells within the same sub-phase resolve in ascending order of `cardNo` (lower card numbers resolve first).
  - Example: Card No.1 (Meteor Fall) resolves before Card No.2 (Immovable Rock).
- **Spell Fizzle / Negation (スペル不発)**:
  - If both players cast the **same spell card** in the same sub-phase on conflicting targets (e.g., overlapping `Front-Back Swap`), the spell can fizzle.
    ![spell_huhatu.png](%E3%83%86%E3%82%99%E3%82%B7%E3%82%99%E3%82%BF%E3%83%AB%E3%82%AB%E3%83%BC%E3%83%88%E3%82%99%E3%82%B1%E3%82%99%E3%83%BC%E3%83%A0%E3%80%8C%E3%83%8C%E3%83%AB%E3%83%9B%E3%82%9A%E3%82%AB%E3%82%99%E3%80%8D%201955a0bf5d894d4788fa4f70df5c7497/spell_huhatu.png)
    ![spell_huhatu2.png](%E3%83%86%E3%82%99%E3%82%B7%E3%82%99%E3%82%BF%E3%83%AB%E3%82%AB%E3%83%BC%E3%83%88%E3%82%99%E3%82%B1%E3%82%99%E3%83%BC%E3%83%A0%E3%80%8C%E3%83%8C%E3%83%AB%E3%83%9B%E3%82%9A%E3%82%AB%E3%82%99%E3%80%8D%201955a0bf5d894d4788fa4f70df5c7497/spell_huhatu2.png)
  - **General Fizzle Detection Algorithm**:
    When identical cards are played in the same sub-phase:
    1. Simulate Branch A (Player 1 executes first, then Player 2).
    2. Simulate Branch B (Player 2 executes first, then Player 1).
    3. If the resulting board states differ, the action fizzles (negated with no effect).
    *(Random-targeting spells like Fire Rain use deterministic seeds so ordering does not cause false fizzles).*