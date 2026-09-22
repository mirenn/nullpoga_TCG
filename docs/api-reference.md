# Nullpoga TCG API Reference

## Table of Contents

1. Authentication API
2. Game Management API
3. Action Operations API
4. Action Data Structures & Enums

---

## 1. Authentication API

### Login

Authenticates user and returns JWT token.

```http
POST /auth/login
```

#### Request Body
```json
{
  "username": "string"
}
```

#### Response
```json
{
  "access_token": "string",
  "user": {
    "userId": "string",
    "username": "string"
  }
}
```

---

## 2. Game Management API

### Start Game / Matchmaking

Starts matchmaking to find an opponent or create a room.

```http
POST /api/start-game
```

- **Auth**: Bearer Token required.

#### Response (Match Found)
```json
{
  "status": "matched",
  "roomId": "string"
}
```

#### Response (Waiting)
```json
{
  "status": "waiting"
}
```

### Get Game State

Retrieves the current game room state.

```http
GET /api/game-state
```

- **Auth**: Bearer Token required.

#### Response
```json
{
  "roomId": "string",
  "gameRoom": {
    "userIds": ["string", "string"],
    "gameState": {
      "player1": { /* Player details */ },
      "player2": { /* Player details */ },
      "history": [ /* TurnHistoryEntry array */ ],
      "renderLastHisIndex": 0
    }
  }
}
```

### Matchmaking Status & Cancellation

```http
GET /api/is-waiting/:userId
```
- Response: `true` | `false`

```http
GET /api/cancel-matching/:userId
```
- Response: `true` | `false`

---

## 3. Action Operations API

### Submit Player Actions (PvP)

Submits all planned phase actions for the turn.

```http
POST /api/player-action
```

- **Auth**: Bearer Token required.

#### Request Body
```json
{
  "spell_phase_actions": [/* Spell Phase Actions */],
  "summon_phase_actions": [/* Summon Phase Actions */],
  "activity_phase_actions": [/* Activity Phase Actions */],
  "roomId": "string"
}
```

#### Response
```json
{
  "success": true,
  "gameState": {
    "roomId": "string",
    "gameRoom": { /* Current Game Room */ }
  }
}
```

### Submit Player Actions (CPU Mode)

Submits player actions and immediately triggers CPU response + turn resolution.

```http
POST /api/player-action-with-cpu
```

- **Auth**: Bearer Token required.

#### Request Body
```json
{
  "spell_phase_actions": [/* Spell Phase Actions */],
  "summon_phase_actions": [/* Summon Phase Actions */],
  "activity_phase_actions": [/* Activity Phase Actions */],
  "roomId": "string"
}
```

#### Response
```json
{
  "success": true,
  "gameState": {
    "roomId": "string",
    "gameRoom": { /* Resolved Game Room with history */ }
  }
}
```

---

## 4. Action Data Structures & Enums

### ActionType Enum

```typescript
export enum ActionType {
  CAST_SPELL = 'CAST_SPELL',
  SUMMON_MONSTER = 'SUMMON_MONSTER',
  MONSTER_MOVE = 'MONSTER_MOVE',
  DISABLE_ACTION = 'DISABLE_ACTION',
  MONSTER_ATTACK = 'MONSTER_ATTACK',
  SPELL_PHASE_END = 'SPELL_PHASE_END',
  SUMMON_PHASE_END = 'SUMMON_PHASE_END',
  ACTIVITY_PHASE_END = 'ACTIVITY_PHASE_END',
}
```

### PhaseKind Enum

```typescript
export enum PhaseKind {
  SPELL_PHASE = 'SPELL_PHASE',
  SUMMON_PHASE = 'SUMMON_PHASE',
  ACTIVITY_PHASE = 'ACTIVITY_PHASE',
  END_PHASE = 'END_PHASE',
  NONE = 'NONE',
}
```

### Action Payload Examples

#### Monster Summon Action
```json
{
  "actionType": "SUMMON_MONSTER",
  "actionData": {
    "monsterCard": {
      "cardNo": 1,
      "cardName": "ネズミ",
      "attack": 1,
      "life": 1,
      "manaCost": 1
    },
    "summonStandbyFieldIdx": 2
  }
}
```

#### Monster Attack Action
```json
{
  "actionType": "MONSTER_ATTACK",
  "actionData": {
    "monsterCard": {
      "cardNo": 1,
      "cardName": "ネズミ"
    }
  }
}
```