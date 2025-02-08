import { Module } from '@nestjs/common';
import { GameApisModule } from './game-apis/game-apis.module';
import { GameModule } from './core/game.module';

@Module({
  imports: [
    GameApisModule,
    GameModule
  ],
})
export class AppModule {}