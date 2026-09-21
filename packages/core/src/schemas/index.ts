import { z } from 'zod';
import { ActionType } from '../models/action';
import { PhaseKind } from '../models/phase';
import { FieldStatus } from '../models/zone';
import { CardType } from '../models/card';

// Enums
export const CardTypeSchema = z.nativeEnum(CardType);
export const PhaseKindSchema = z.nativeEnum(PhaseKind);
export const FieldStatusSchema = z.nativeEnum(FieldStatus);
export const ActionTypeSchema = z.nativeEnum(ActionType);

// Card Schemas
export const MonsterCardSchema = z.object({
  cardNo: z.number(),
  manaCost: z.number(),
  cardName: z.string(),
  attack: z.number(),
  life: z.number(),
  imageUrl: z.string().nullable().optional(),
  cardType: z.literal(CardType.MONSTER),
  uniqId: z.string(),
  stunCount: z.number().default(0),
  justSummoned: z.boolean().default(true),
  canAct: z.boolean().default(false),
  attackDeclaration: z.boolean().default(false),
});

export const SpellCardSchema = z.object({
  cardNo: z.number(),
  cardName: z.string(),
  manaCost: z.number(),
  cardType: z.literal(CardType.SPELL),
  effect: z.string(),
  uniqId: z.string(),
  imageUrl: z.string().nullable().optional(),
});

export const CardDataSchema = z.union([MonsterCardSchema, SpellCardSchema]);

// Action Schemas
export const ActionDataSchema = z.object({
  spellCard: SpellCardSchema.nullable().optional(),
  monsterCard: MonsterCardSchema.nullable().optional().or(z.any()),
  summonStandbyFieldIdx: z.number().nullable().optional(),
  moveBattleFieldIdx: z.number().nullable().optional(),
  moveDirection: z.string().nullable().optional(),
  attackDeclarationIdx: z.number().nullable().optional(),
  attackerIdx: z.number().nullable().optional(),
  targetIdx: z.number().nullable().optional(),
  fromIdx: z.number().nullable().optional(),
  toIdx: z.number().nullable().optional(),
});

export const ActionDTOSchema = z.object({
  actionType: ActionTypeSchema,
  actionData: ActionDataSchema.optional(),
});

// Zone & Slot Schemas
export const SlotDataSchema = z.object({
  status: FieldStatusSchema,
  card: MonsterCardSchema.nullable().optional(),
});

export const ZoneDataSchema = z.object({
  battleField: z.array(SlotDataSchema),
  standbyField: z.array(MonsterCardSchema.nullable()),
});

// Player Schema
export const PlayerDataSchema = z.object({
  userId: z.string(),
  turnCount: z.number(),
  deckCards: z.array(CardDataSchema),
  planDeckCards: z.array(CardDataSchema).optional(),
  handCards: z.array(CardDataSchema),
  planHandCards: z.array(CardDataSchema),
  zone: ZoneDataSchema,
  planZone: ZoneDataSchema,
  phase: PhaseKindSchema,
  base_mana: z.number().optional(),
  mana: z.number(),
  planMana: z.number().optional(),
  life: z.number(),
  spellPhaseActions: z.array(ActionDTOSchema),
  summonPhaseActions: z.array(ActionDTOSchema),
  activityPhaseActions: z.array(ActionDTOSchema),
  isFirstPlayer: z.boolean().nullable().optional(),
});

// State & History Schemas
export const HistoryEntryDTOSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    State: StateDataSchema,
    ActionDict: z.record(z.string(), ActionDTOSchema),
  })
);

export const StateDataSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    player1: PlayerDataSchema,
    player2: PlayerDataSchema,
    history: z.array(z.array(HistoryEntryDTOSchema)),
    renderLastHisIndex: z.number().optional(),
  })
);

export const GameRoomDTOSchema = z.object({
  userIds: z.array(z.string()).optional(),
  players: z.array(z.string()).optional(),
  gameState: StateDataSchema,
});

export const RoomStateResponseSchema = z.object({
  room_id: z.string().optional(),
  gameRoom: GameRoomDTOSchema,
});
