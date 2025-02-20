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
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
let GameApisController = class GameApisController {
    constructor(gameApisService) {
        this.gameApisService = gameApisService;
    }
    startGame(req) {
        return this.gameApisService.startGame();
    }
    getGameState(req) {
        return this.gameApisService.getGameState(req.user.userId);
    }
    playerAction(action, req) {
        const actionWithUser = Object.assign(Object.assign({}, action), { userId: req.user.userId });
        return this.gameApisService.handlePlayerAction(actionWithUser);
    }
};
exports.GameApisController = GameApisController;
__decorate([
    (0, common_1.Get)('start_game'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], GameApisController.prototype, "startGame", null);
__decorate([
    (0, common_1.Get)('game_state'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], GameApisController.prototype, "getGameState", null);
__decorate([
    (0, common_1.Post)('player_action'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], GameApisController.prototype, "playerAction", null);
exports.GameApisController = GameApisController = __decorate([
    (0, common_1.Controller)('api'),
    __metadata("design:paramtypes", [game_apis_service_1.GameApisService])
], GameApisController);
//# sourceMappingURL=game-apis.controller.js.map