# ヌルポガ TCG APIリファレンス

## 目次

1. 認証API
2. ゲーム管理API
3. アクション操作API

## 認証API

### ログイン

ユーザー認証を行い、JWTトークンを取得します。

```
POST /auth/login
```

#### リクエストボディ

```json
{
  "username": "string"
}
```

#### レスポンス

```json
{
  "access_token": "string",
  "user": {
    "userId": "string",
    "username": "string"
  }
}
```

## ゲーム管理API

### ゲーム開始（マッチメイキング）

対戦相手とのマッチメイキングを開始します。

```
POST /api/start-game
```

#### 認証
- Bearer トークン必須

#### レスポンス
- 対戦相手が見つかった場合
```json
{
  "status": "matched",
  "roomId": "string"
}
```

- 対戦相手待ちの場合
```json
{
  "status": "waiting"
}
```

### ゲーム状態取得

現在のゲーム状態を取得します。

```
GET /api/game-state
```

#### 認証
- Bearer トークン必須

#### レスポンス

```json
{
  "roomId": "string",
  "gameRoom": {
    "userIds": ["string", "string"],
    "gameState": {
      "player1": { /* プレイヤー情報 */ },
      "player2": { /* プレイヤー情報 */ },
      "history": [ /* 履歴情報 */ ],
      "renderLastHisIndex": number
    }
  }
}
```

### マッチング待機状態確認

ユーザーがマッチング待機中かどうかを確認します。

```
GET /api/is-waiting/:userId
```

#### パスパラメータ
- `userId`: ユーザーID

#### レスポンス

```json
true または false
```

### マッチング待機キャンセル

マッチング待機をキャンセルします。

```
GET /api/cancel-matching/:userId
```

#### パスパラメータ
- `userId`: ユーザーID

## アクション操作API

### プレイヤーアクション提出（対人戦）

プレイヤーのアクションを提出します。

```
POST /api/player-action
```

#### 認証
- Bearer トークン必須

#### リクエストボディ

```json
{
  "spell_phase_actions": [/* スペルフェイズのアクション */],
  "summon_phase_actions": [/* 進軍召喚フェイズのアクション */],
  "activity_phase_actions": [/* 行動フェイズのアクション */],
  "roomId": "string"
}
```

#### レスポンス

```json
{
  "success": true,
  "gameState": {
    "roomId": "string",
    "gameRoom": {
      /* ゲーム状態 */
    }
  }
}
```

### プレイヤーアクション提出（CPU戦）

プレイヤーのアクションを提出し、CPUの応答も自動的に処理します。

```
POST /api/player-action-with-cpu
```

#### 認証
- Bearer トークン必須

#### リクエストボディ

```json
{
  "spell_phase_actions": [/* スペルフェイズのアクション */],
  "summon_phase_actions": [/* 進軍召喚フェイズのアクション */],
  "activity_phase_actions": [/* 行動フェイズのアクション */],
  "roomId": "string"
}
```

#### レスポンス

```json
{
  "success": true,
  "gameState": {
    "roomId": "string",
    "gameRoom": {
      /* ゲーム状態 */
    }
  }
}
```

## アクションデータ構造

### アクションタイプ

アクションタイプは以下の値を取ります:

```typescript
enum ActionType {
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

### フェイズ種別

フェイズ種別は以下の値を取ります:

```typescript
enum PhaseKind {
  SPELL_PHASE = 'SPELL_PHASE',
  SUMMON_PHASE = 'SUMMON_PHASE',
  ACTIVITY_PHASE = 'ACTIVITY_PHASE',
  END_PHASE = 'END_PHASE',
  NONE = 'NONE',
}
```

### モンスター召喚アクション例

```json
{
  "actionType": "SUMMON_MONSTER",
  "actionData": {
    "monsterCard": { /* モンスターカード情報 */ },
    "summonStandbyFieldIdx": 2
  }
}
```

### モンスター攻撃アクション例

```json
{
  "actionType": "MONSTER_ATTACK",
  "actionData": {
    "monsterCard": { /* モンスターカード情報 */ }
  }
}
```