"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameApisService = void 0;
const common_1 = require("@nestjs/common");
const game_service_1 = require("../core/game.service");
let GameApisService = class GameApisService {
    constructor(gameService) {
        this.gameService = gameService;
    }
    startGame() {
        const gameId = Date.now().toString();
        this.gameService.createGame(gameId);
        return { gameId };
    }
    handlePlayerAction(action) {
        return this.gameService.executeGameAction(action.gameId, action);
    }
};
exports.GameApisService = GameApisService;
exports.GameApisService = GameApisService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [game_service_1.GameService])
], GameApisService);
//# sourceMappingURL=game-apis.service.js.map