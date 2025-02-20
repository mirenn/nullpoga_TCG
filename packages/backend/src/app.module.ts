import { Module } from '@nestjs/common';
import { GameApisModule } from './game-apis/game-apis.module';
import { GameModule } from './core/game.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    GameApisModule,
    GameModule,
    AuthModule
  ],
})
export class AppModule {}