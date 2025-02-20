import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { GameApisService } from './game-apis.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api')
export class GameApisController {
  constructor(private readonly gameApisService: GameApisService) {}

  @Get('start_game')
  @UseGuards(JwtAuthGuard)
  startGame(@Request() req) {
    // reqからユーザー情報を取得できます
    return this.gameApisService.startGame();
  }
  
  @Get('game_state')
  @UseGuards(JwtAuthGuard)
  getGameState(@Request() req) {
    // JWTから取得したユーザーIDを使用
    return this.gameApisService.getGameState(req.user.userId);
  }

  @Post('player_action')
  @UseGuards(JwtAuthGuard)
  playerAction(@Body() action: any, @Request() req) {
    // アクションにユーザー情報を追加
    const actionWithUser = {
      ...action,
      userId: req.user.userId
    };
    return this.gameApisService.handlePlayerAction(actionWithUser);
  }
}