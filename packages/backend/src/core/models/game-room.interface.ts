import { State } from './state';

export interface GameRoom {
    players: string[];
    game_state: State;
}