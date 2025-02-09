import { Injectable } from '@nestjs/common';
import { GameService } from '../core/game.service';

@Injectable()
export class GameApisService {
  constructor(private readonly gameService: GameService) {}

  startGame() {
    const gameId = Date.now().toString(); // 一時的なゲームID生成
    this.gameService.createGame(gameId);
    return { gameId };
  }

  handlePlayerAction(action: any) {
    return this.gameService.executeGameAction(action.gameId, action);
  }
}