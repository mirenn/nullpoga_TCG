import { Module } from '@nestjs/common';
import { GameApisModule } from './game-apis/game-apis.module';
import { PagesModule } from './pages/pages.module';

@Module({
  imports: [
    GameApisModule,
    PagesModule
  ],
})
export class AppModule {}