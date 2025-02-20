import { Injectable } from '@nestjs/common';
import { GameRoom } from '../core/models/game-room.interface';
import { GameService } from '../core/game.service';

@Injectable()
export class GameApisService {
  constructor(private readonly gameService: GameService) {}

  startGame() {
    const gameId = Date.now().toString(); // 一時的なゲームID生成
    this.gameService.createGame(gameId, ['player1', 'player2']);
    return { gameId };
  }

  getGameState(userId: string): { room_id: string; gameRoom: GameRoom | undefined } {
    return this.gameService.getGameState(userId);
  }

  handlePlayerAction(action: any) {
    return this.gameService.executeGameAction(action.gameId, action);
  }
}