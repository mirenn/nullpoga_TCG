import { create } from 'zustand';
import * as GameModels from '../types/gameModels';

export interface GameState {
  gameResponse: GameModels.RoomStateResponse | null;
  extractedGameResponse: GameModels.RoomStateResponse | null;
  spellPhaseActions: GameModels.Action[];
  summonPhaseActions: GameModels.Action[];
  activityPhaseActions: GameModels.Action[];

  // Actions
  setGameResponse: (
    response:
      | GameModels.RoomStateResponse
      | null
      | ((prev: GameModels.RoomStateResponse | null) => GameModels.RoomStateResponse | null),
  ) => void;
  setExtractedGameResponse: (
    response:
      | GameModels.RoomStateResponse
      | null
      | ((prev: GameModels.RoomStateResponse | null) => GameModels.RoomStateResponse | null),
  ) => void;
  setSpellPhaseActions: (
    actions:
      | GameModels.Action[]
      | ((prev: GameModels.Action[]) => GameModels.Action[]),
  ) => void;
  setSummonPhaseActions: (
    actions:
      | GameModels.Action[]
      | ((prev: GameModels.Action[]) => GameModels.Action[]),
  ) => void;
  setActivityPhaseActions: (
    actions:
      | GameModels.Action[]
      | ((prev: GameModels.Action[]) => GameModels.Action[]),
  ) => void;
  resetAllPhaseActions: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  gameResponse: null,
  extractedGameResponse: null,
  spellPhaseActions: [],
  summonPhaseActions: [],
  activityPhaseActions: [],

  setGameResponse: (response) =>
    set((state) => ({
      gameResponse:
        typeof response === 'function' ? response(state.gameResponse) : response,
    })),

  setExtractedGameResponse: (response) =>
    set((state) => ({
      extractedGameResponse:
        typeof response === 'function'
          ? response(state.extractedGameResponse)
          : response,
    })),

  setSpellPhaseActions: (actions) =>
    set((state) => ({
      spellPhaseActions:
        typeof actions === 'function'
          ? actions(state.spellPhaseActions)
          : actions,
    })),

  setSummonPhaseActions: (actions) =>
    set((state) => ({
      summonPhaseActions:
        typeof actions === 'function'
          ? actions(state.summonPhaseActions)
          : actions,
    })),

  setActivityPhaseActions: (actions) =>
    set((state) => ({
      activityPhaseActions:
        typeof actions === 'function'
          ? actions(state.activityPhaseActions)
          : actions,
    })),

  resetAllPhaseActions: () =>
    set({
      spellPhaseActions: [],
      summonPhaseActions: [],
      activityPhaseActions: [],
    }),
}));
