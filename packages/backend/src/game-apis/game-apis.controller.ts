import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { GameApisService } from './game-apis.service';

@Controller('api')
export class GameApisController {
  constructor(private readonly gameApisService: GameApisService) {}

  @Get('start_game')
  startGame() {
    return this.gameApisService.startGame();
  }
  
  @Get('game_state/:userId')
  getGameState(@Param('userId') userId: string) {
    return this.gameApisService.getGameState(userId);
  }

  @Post('player_action')
  playerAction(@Body() action: any) {
    return this.gameApisService.handlePlayerAction(action);
  }
}