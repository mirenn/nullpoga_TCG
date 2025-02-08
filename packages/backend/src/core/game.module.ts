import { Global, Module } from '@nestjs/common';
import { GameService } from './game.service';

@Global()
@Module({
    providers: [GameService],
    exports: [GameService],
})
export class GameModule {}