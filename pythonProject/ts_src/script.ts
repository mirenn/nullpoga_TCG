type GameStateResponse = {
  room_id: string;
  state: any; // 実際の `state` の型に応じて定義を変更してください
};

async function getGameState(userId: string): Promise<GameStateResponse | null> {
  const url = `http://127.0.0.1:8000/test_game_state/${userId}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }

    const data: GameStateResponse = await response.json();
    console.log('Game State:', data);
    return data;
  } catch (error) {
    console.error('Failed to fetch game state:', error);
    return null;
  }
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
