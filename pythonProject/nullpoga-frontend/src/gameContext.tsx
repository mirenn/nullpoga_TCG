import React, { createContext, useContext, useState } from 'react';
import * as GameModels from './gameModels';

interface GameContextType {
  gameResponse: GameModels.GameStateResponse | null;
  setGameResponse: React.Dispatch<
    React.SetStateAction<GameModels.GameStateResponse | null>
  >;
  extractedGameResponse: GameModels.GameStateResponse | null;
  setExtractedGameResponse: React.Dispatch<
    React.SetStateAction<GameModels.GameStateResponse | null>
  >;
  spellPhaseActions: GameModels.Action[];
  setSpellPhaseActions: React.Dispatch<
    React.SetStateAction<GameModels.Action[]>
  >;
  summonPhaseActions: GameModels.Action[];
  setSummonPhaseActions: React.Dispatch<
    React.SetStateAction<GameModels.Action[]>
  >;
  activityPhaseActions: GameModels.Action[];
  setActivityPhaseActions: React.Dispatch<
    React.SetStateAction<GameModels.Action[]>
  >;
}

const defaultGameContext: GameContextType = {
  gameResponse: null,
  setGameResponse: () => {},
  /**gameResponseは使わずにextractedGameResponseだけ使うかも。 */
  extractedGameResponse: null,
  setExtractedGameResponse: () => {},
  spellPhaseActions: [],
  setSpellPhaseActions: () => {},
  summonPhaseActions: [],
  setSummonPhaseActions: () => {},
  activityPhaseActions: [],
  setActivityPhaseActions: () => {},
};

export const GameContext = createContext<GameContextType>(defaultGameContext);

interface GameProviderProps {
  children: React.ReactNode;
}

export const GameProvider = ({ children }: GameProviderProps) => {
  const [gameResponse, setGameResponse] =
    useState<GameModels.GameStateResponse | null>(null);
  const [extractedGameResponse, setExtractedGameResponse] =
    useState<GameModels.GameStateResponse | null>(null);
  const [spellPhaseActions, setSpellPhaseActions] = useState<
    GameModels.Action[]
  >([]);
  const [summonPhaseActions, setSummonPhaseActions] = useState<
    GameModels.Action[]
  >([]);
  const [activityPhaseActions, setActivityPhaseActions] = useState<
    GameModels.Action[]
  >([]);

  return (
    <GameContext.Provider
      value={{
        extractedGameResponse,
        setExtractedGameResponse,
        gameResponse,
        setGameResponse,
        spellPhaseActions,
        setSpellPhaseActions,
        summonPhaseActions,
        setSummonPhaseActions,
        activityPhaseActions,
        setActivityPhaseActions,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

// export const useGameContext = () => {
//   return useContext(GameContext);
// };
