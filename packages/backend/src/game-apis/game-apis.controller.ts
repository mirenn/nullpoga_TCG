import { Controller, Get, Post, Body } from '@nestjs/common';
import { GameApisService } from './game-apis.service';

@Controller('api')
export class GameApisController {
  constructor(private readonly gameApisService: GameApisService) {}

  @Get('start_game')
  startGame() {
    return this.gameApisService.startGame();
  }

  @Post('player_action')
  playerAction(@Body() action: any) {
    return this.gameApisService.handlePlayerAction(action);
  }
}