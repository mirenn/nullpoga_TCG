import { Controller, Get, Post, Body, UseGuards, Request, Param } from '@nestjs/common';
import { GameApisService } from './game-apis.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api')
export class GameApisController {
  constructor(private readonly gameApisService: GameApisService) {}

  @Post('start-game')
  @UseGuards(JwtAuthGuard)
  async startGame(@Request() req) {
    const userId = req.user.userId;
    return await this.gameApisService.startMatchmaking(userId);
  }

  @Get('game-state')
  @UseGuards(JwtAuthGuard)
  async getGameState(@Request() req) {
    const userId = req.user.userId;
    return await this.gameApisService.getGameState(userId);
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


  // プレイヤーが/game-apis/start-game/{userId}エンドポイントを呼び出してマッチメイキングを開始
  // 別のプレイヤーが待機中の場合は、すぐにマッチが成立してゲームルームが作成され、{ status: 'matched', roomId: string }が返される
  // 待機中のプレイヤーがいない場合は、待機キューに追加され、{ status: 'waiting' }が返される
  // プレイヤーは/game-apis/is-waiting/{userId}で待機状態を確認できる
  // 必要に応じて/game-apis/cancel-matching/{userId}でマッチング待機をキャンセル可能



  @Get('is-waiting/:userId')
  isWaiting(@Param('userId') userId: string) {
    return this.gameApisService.isWaiting(userId);
  }

  @Post('cancel-matching/:userId')
  cancelMatching(@Param('userId') userId: string) {
    return this.gameApisService.cancelMatching(userId);
  }

}