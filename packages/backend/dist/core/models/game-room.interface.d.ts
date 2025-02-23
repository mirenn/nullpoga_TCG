import { State } from './state';
export interface GameRoom {
    userIds: string[];
    gameState: State;
}
