import GameBoard from './components/GameBoard';
import Hand from './components/Hand';
import PlayerStats from './components/PlayerStats';
import ButtonContainer from './components/ButtonContainer';
import ResultContainer from './components/ResultContainer';
import './App.css'

function App() {
  return (
    <div>
        <h1>nullpogaTCG client仮実装</h1>
        <GameBoard />
        <Hand />
        <PlayerStats />
        <ButtonContainer />
        <ResultContainer />
    </div>
  );
};

export default App;