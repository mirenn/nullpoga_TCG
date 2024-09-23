"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function getGameState(userId) {
    return __awaiter(this, void 0, void 0, function* () {
        const url = `http://127.0.0.1:8000/test_game_state/${userId}`;
        try {
            const response = yield fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            if (!response.ok) {
                throw new Error(`Error: ${response.status}`);
            }
            const data = yield response.json();
            console.log('Game State:', data);
            return data;
        }
        catch (error) {
            console.error('Failed to fetch game state:', error);
            return null;
        }
    });
}
console.log('nagai test');
// // 使用例
// getGameState('user123')
//   .then((gameState) => {
//     if (gameState) {
//       console.log('Game State:', gameState);
//     }
//   })
//   .catch((error) => {
//     console.error('An error occurred:', error);
//   });
