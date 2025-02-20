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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var GameService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameService = void 0;
const common_1 = require("@nestjs/common");
const state_1 = require("./models/state");
const async_lock_1 = __importDefault(require("async-lock"));
let GameService = GameService_1 = class GameService {
    constructor() {
        this.games = new Map();
        this.userToRoom = new Map();
        if (!GameService_1.instance) {
            GameService_1.instance = this;
            this.lock = new async_lock_1.default();
        }
        return GameService_1.instance;
    }
    createGame(roomId, players) {
        const state = new state_1.State();
        state.initGame();
        this.games.set(roomId, {
            players: players,
            game_state: state
        });
    }
    getGameState(roomId) {
        return { "room_id": roomId, "gameRoom": this.games.get(roomId) };
    }
    joinRoom(userId, roomId) {
        this.userToRoom.set(userId, roomId);
    }
    getUserRoom(userId) {
        return this.userToRoom.get(userId);
    }
    async executeGameAction(roomId, action) {
        await this.withLock(roomId, async () => {
            const gameRoom = this.games.get(roomId);
            if (!gameRoom) {
                throw new Error('Game not found');
            }
            const nextState = gameRoom.game_state.next(action);
            gameRoom.game_state = nextState;
            this.games.set(roomId, gameRoom);
        });
    }
    async withLock(roomId, operation) {
        return await this.lock.acquire(roomId, operation, {
            timeout: 5000,
            skipQueue: false
        });
    }
};
exports.GameService = GameService;
exports.GameService = GameService = GameService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], GameService);
//# sourceMappingURL=game.service.js.map