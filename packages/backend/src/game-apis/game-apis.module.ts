import { Module } from '@nestjs/common';
import { GameApisController } from './game-apis.controller';
import { GameApisService } from './game-apis.service';

@Module({
  controllers: [GameApisController],
  providers: [GameApisService],
})
export class GameApisModule {}