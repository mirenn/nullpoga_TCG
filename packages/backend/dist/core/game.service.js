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
var GameService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameService = void 0;
const common_1 = require("@nestjs/common");
let GameService = GameService_1 = class GameService {
    constructor() {
        this.games = new Map();
        if (!GameService_1.instance) {
            GameService_1.instance = this;
        }
        return GameService_1.instance;
    }
    createGame(gameId) {
        this.games.set(gameId, {});
    }
    getGame(gameId) {
        return this.games.get(gameId);
    }
    executeGameAction(gameId, action, data) {
        const game = this.games.get(gameId);
        if (!game) {
            throw new Error('Game not found');
        }
    }
};
exports.GameService = GameService;
exports.GameService = GameService = GameService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], GameService);
//# sourceMappingURL=game.service.js.map