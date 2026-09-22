# Nullpoga TCG Requirements Document

## 1. Project Overview

### 1.1 Name
Digital Card Game "Nullpoga" (ヌルポガ TCG)

### 1.2 Objective
Develop a digital collectible card game with simultaneous hidden planning and deterministic resolution mechanics.

### 1.3 Target Tech Stack
- Frontend: React / Next.js (`packages/web`)
- Backend / Core Logic: Nest.js / TypeScript (`packages/core`)

## 2. Game Specifications

### 2.1 Core Rules

#### 2.1.1 Gameplay Format
- **Simultaneous Action Planning & Resolution**: Turn-based, but both players plan simultaneously in secret.
- **Three Core Phases per Turn**: Spell Phase, March/Summon Phase, Activity Phase.
- Neither player sees the opponent's planned moves until both submit plans to the server.
- The server processes all actions deterministically and returns the state history for client playback.

#### 2.1.2 Resource Management
- **Mana System**: +1 available mana per turn. Starts at 1, max 10.

#### 2.1.3 Field / Zone Structure
- **5 Columns**:
  - **Standby Zone**: Placement zone for newly summoned monsters.
  - **Battle Zone**: Active combat zone where monsters move and attack.

#### 2.1.4 Card & Deck Rules
- Two card types: **Spell Cards** and **Monster Cards**.
- Deck: 30 cards. Max 2 copies of identical cards.
- Hand: Start with 5 cards. Draw 1 card at the beginning of each turn.

#### 2.1.5 Victory Conditions
- Reduce opponent's Life (starts at 20) to <= 0.
- Turn 4 consecutive Battle Zones of the opponent into Wilderness (荒野状態).
- Simultaneous achievement tiebreaker: Player with higher remaining Life wins. If tied, it is a draw.

### 2.2 Turn Flow & Phase Execution

#### 2.2.1 Turn Progression Overview
1. **Planning Phase (Client-side concurrent)**
   - Both players place cards, select targets, and plan movement/attacks.
   - Planned actions are displayed as tentative ghosts/previews on the UI.
   - Clicking "End Turn / Submit" locks plans and sends them to the server.
2. **Execution Phase (Server-side deterministic)**
   - Resolves all submitted actions in strict phase order.
   - Generates step-by-step history snapshots for client animation playback.
3. **Turn Execution Sequence**
   1. Turn Start processing (+1 mana, draw 1 card, apply turn-start triggers).
   2. Spell Phase (evaluated in sub-phases: Spell 1, 2, ... N).
   3. March/Summon Phase (summoning monsters, marching existing standby monsters).
   4. Activity Phase (Movement sub-phase -> Attack sub-phase).
   5. Turn End processing (end-of-turn triggers, check victory conditions).

#### 2.2.2 Spell Phase Details
- Resolves sub-phase by sub-phase (Spell 1 -> Spell 2 -> ...).
- Within the same sub-phase, cards resolve by ascending `cardNo`.
- **Fizzle Condition (不発判定)**:
  - When both players cast the same card in the same sub-phase with conflicting target resolutions:
    1. Simulate outcome if Player A executes first.
    2. Simulate outcome if Player B executes first.
    3. If the two simulated boards differ, the spell fizzles (negated with no effect).

#### 2.2.3 March / Summon Phase Details
- Players summon monsters to their Standby Zone.
- Any monster already present in Standby Zone before this turn marches forward into Battle Zone.
- Newly summoned monsters stay in Standby Zone until next turn's march.

#### 2.2.4 Activity Phase Details
- Only monsters in the Battle Zone can act.
- **Movement Step**: All planned unit moves execute first (moving left/right to an adjacent empty zone).
- **Attack Step**: Monsters initiate attacks from their post-movement positions.
  - Monster vs Monster: Deal damage equal to attack power to the opposing monster.
  - Direct Attack: If no enemy monster is in the opposing Battle Zone, deal damage equal to attack power directly to the opposing player's Life, and convert that Battle Zone into Wilderness.

### 2.3 Technical Requirements

#### 2.3.1 Frontend (`packages/web`)
- React 19 / Next.js / TypeScript.
- Key Components:
  - `GameBoard`: Field layout with Standby and Battle zones.
  - `Hand`: Player hand view with interactive card cards.
  - `MonsterCard`: Card visuals with attack, life, status icons.
  - `GameClient`: State synchronization, turn submit logic, animation step engine.

#### 2.3.2 Backend & Core (`packages/core`, Nest.js)
- Core Models:
  - `Card`, `MonsterCard`, `SpellCard`
  - `Player`: Hand, deck, graveyard, mana, life, status flags.
  - `Zone`: Standby and Battle slots with wilderness flags.
  - `Action`: Polymorphic player action definitions (`ActionType`, `PhaseKind`).
  - `State`: Complete board representation, history timeline (`turnHistory`), simulation branches.

#### 2.3.3 API Specifications
- `GET /api/game-state`: Get current room state.
- `POST /api/player-action`: Submit PvP action batch.
- `POST /api/player-action-with-cpu`: Submit action batch and execute CPU turn.
- `POST /auth/login`: User authentication returning JWT token.