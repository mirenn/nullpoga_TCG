import { Injectable, BadRequestException } from '@nestjs/common';
import { GameRoom } from '../core/models/game-room.interface';
import { GameService } from '../core/game.service';

@Injectable()
export class GameApisService {
  constructor(private readonly gameService: GameService) {}

  /**
   * ユーザーのマッチメイキングを開始します。
   * マッチメイキングが成功すると、対戦相手が見つかりゲームルームが作成されます。
   * @param userId - マッチメイキングを開始するユーザーのID
   * @returns マッチメイキングの結果
   */
  async startMatchmaking(userId: string) {
    // マッチメイキングを開始
    const matchResult = await this.gameService.startMatching(userId);
    return matchResult;
  }

  async getGameState(userId: string): Promise<{ roomId: string; gameRoom: GameRoom | undefined }> {
    const roomId = this.gameService.getUserRoom(userId);
    if (!roomId) {
      throw new Error(`User with ID ${userId} is not in a room`);
    }
    
    return await this.gameService.withLock(roomId, async () => {
      const gameRoom = this.gameService.getGameState(userId);
      return gameRoom;
    });
  }

  async handlePlayerAction(action: any) {
    if (!action.roomId) {
      throw new BadRequestException('roomId is required and cannot be empty');
    }
    await this.gameService.executeGameAction(action.roomId, action);
    
    // ゲームの最新状態を取得して返す
    const gameRoom = await this.gameService.getGameState(action.userId);
    return {
      success: true,
      gameState: gameRoom
    };
  }

  // マッチング待機状態を確認
  isWaiting(userId: string): boolean {
    return this.gameService.isWaiting(userId);
  }

  // マッチング待機をキャンセル
  cancelMatching(userId: string): void {
    return this.gameService.cancelMatching(userId);
  }
}