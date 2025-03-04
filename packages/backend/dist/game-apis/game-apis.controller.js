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
    async startGame(req) {
        const userId = req.user.userId;
        return await this.gameApisService.startMatchmaking(userId);
    }
    async getGameState(req) {
        const userId = req.user.userId;
        return await this.gameApisService.getGameState(userId);
    }
    playerAction(action, req) {
        const actionWithUser = Object.assign(Object.assign({}, action), { userId: req.user.userId });
        return this.gameApisService.handlePlayerAction(actionWithUser);
    }
    isWaiting(userId) {
        return this.gameApisService.isWaiting(userId);
    }
    cancelMatching(userId) {
        return this.gameApisService.cancelMatching(userId);
    }
};
exports.GameApisController = GameApisController;
__decorate([
    (0, common_1.Post)('start-game'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], GameApisController.prototype, "startGame", null);
__decorate([
    (0, common_1.Get)('game-state'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
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
__decorate([
    (0, common_1.Get)('is-waiting/:userId'),
    __param(0, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], GameApisController.prototype, "isWaiting", null);
__decorate([
    (0, common_1.Post)('cancel-matching/:userId'),
    __param(0, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], GameApisController.prototype, "cancelMatching", null);
exports.GameApisController = GameApisController = __decorate([
    (0, common_1.Controller)('api'),
    __metadata("design:paramtypes", [game_apis_service_1.GameApisService])
], GameApisController);
//# sourceMappingURL=game-apis.controller.js.map