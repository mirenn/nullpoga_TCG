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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameApisController = void 0;
const common_1 = require("@nestjs/common");
const game_apis_service_1 = require("./game-apis.service");
let GameApisController = class GameApisController {
    constructor(gameApisService) {
        this.gameApisService = gameApisService;
    }
    startGame() {
        return this.gameApisService.startGame();
    }
    getGameState(userId) {
        return this.gameApisService.getGameState(userId);
    }
    playerAction(action) {
        return this.gameApisService.handlePlayerAction(action);
    }
};
exports.GameApisController = GameApisController;
__decorate([
    (0, common_1.Get)('start_game'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], GameApisController.prototype, "startGame", null);
__decorate([
    (0, common_1.Get)('game_state/:userId'),
    __param(0, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], GameApisController.prototype, "getGameState", null);
__decorate([
    (0, common_1.Post)('player_action'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], GameApisController.prototype, "playerAction", null);
exports.GameApisController = GameApisController = __decorate([
    (0, common_1.Controller)('api'),
    __metadata("design:paramtypes", [game_apis_service_1.GameApisService])
], GameApisController);
//# sourceMappingURL=game-apis.controller.js.map