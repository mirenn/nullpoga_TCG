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
const player_1 = require("./models/player");
let GameService = GameService_1 = class GameService {
    constructor() {
        this.games = new Map();
        this.userToRoom = new Map();
        this.waitingPlayers = ['player2'];
        if (!GameService_1.instance) {
            GameService_1.instance = this;
            this.lock = new async_lock_1.default();
        }
        return GameService_1.instance;
    }
    createGame(userIds) {
        const roomId = Date.now().toString();
        const player1 = new player_1.Player([7, 5, 2, 1, 4, 6, 7, 5, 1, 4, 3, 3, 6, 2], userIds[0]);
        const player2 = new player_1.Player([4, 1, 7, 5, 5, 7, 6, 3, 4, 1, 3, 6, 2, 2], userIds[1]);
        const state = new state_1.State(player1, player2);
        state.initGame();
        this.games.set(roomId, {
            userIds: userIds,
            gameState: state
        });
        userIds.forEach(userId => this.joinRoom(userId, roomId));
        return roomId;
    }
    async startMatching(userId) {
        if (this.getUserRoom(userId)) {
            throw new Error('User is already in a room');
        }
        if (this.waitingPlayers.length > 0) {
            const opponent = this.waitingPlayers.shift();
            const roomId = this.createGame([userId, opponent]);
            return { status: 'matched', roomId };
        }
        this.waitingPlayers.push(userId);
        return { status: 'waiting' };
    }
    getGameState(userId) {
        const roomId = this.getUserRoom(userId);
        if (!roomId) {
            throw new Error('User is not in a room');
        }
        return { roomId, gameRoom: this.games.get(roomId) };
    }
    joinRoom(userId, roomId) {
        this.userToRoom.set(userId, roomId);
    }
    getUserRoom(userId) {
        return this.userToRoom.get(userId);
    }
    isWaiting(userId) {
        return this.waitingPlayers.includes(userId);
    }
    cancelMatching(userId) {
        const index = this.waitingPlayers.indexOf(userId);
        if (index !== -1) {
            this.waitingPlayers.splice(index, 1);
        }
    }
    async executeGameAction(roomId, action) {
        await this.withLock(roomId, async () => {
            const gameRoom = this.games.get(roomId);
            if (!gameRoom) {
                throw new Error('Game not found');
            }
            const nextState = gameRoom.gameState.next(action);
            gameRoom.gameState = nextState;
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