import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthProvider";
import { RaceProvider } from "./race/RaceProvider";
import { Landing } from "./screens/Landing";
import { RaceLanding } from "./screens/RaceLanding";
import { Lobby } from "./screens/Lobby";
import { Race } from "./screens/Race";
import { Spectate } from "./screens/Spectate";
import { Results } from "./screens/Results";
import { Login } from "./screens/Login";
import { Register } from "./screens/Register";
import { MyRooms } from "./screens/MyRooms";
import { RoomLeaderboard } from "./screens/RoomLeaderboard";
import { GlobalLeaderboard } from "./screens/GlobalLeaderboard";
import { Training } from "./screens/Training";
import { TrainingHistory } from "./screens/TrainingHistory";
import { HangmanProvider } from "./hangman/HangmanProvider";
import { HangmanLanding } from "./hangman/HangmanLanding";
import { HangmanLobby } from "./hangman/HangmanLobby";
import { HangmanPlay } from "./hangman/HangmanPlay";
import { HangmanSpectate } from "./hangman/HangmanSpectate";
import { XoProvider } from "./xo/XoProvider";
import { XoLanding } from "./xo/XoLanding";
import { XoLobby } from "./xo/XoLobby";
import { XoPlay } from "./xo/XoPlay";
import { XoSpectate } from "./xo/XoSpectate";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <RaceProvider>
          <HangmanProvider>
          <XoProvider>
          <main className="app">
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/race" element={<RaceLanding />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/me/rooms" element={<MyRooms />} />
              <Route path="/me/training" element={<TrainingHistory />} />
              <Route path="/train" element={<Training />} />
              <Route path="/leaderboard" element={<GlobalLeaderboard />} />
              <Route path="/room/:code" element={<Lobby />} />
              <Route path="/room/:code/race" element={<Race />} />
              <Route path="/room/:code/spectate" element={<Spectate />} />
              <Route path="/room/:code/results" element={<Results />} />
              <Route path="/room/:code/leaderboard" element={<RoomLeaderboard />} />
              <Route path="/hangman" element={<HangmanLanding />} />
              <Route path="/hangman/room/:code" element={<HangmanLobby />} />
              <Route path="/hangman/room/:code/play" element={<HangmanPlay />} />
              <Route path="/hangman/room/:code/spectate" element={<HangmanSpectate />} />
              <Route path="/xo" element={<XoLanding />} />
              <Route path="/xo/room/:code" element={<XoLobby />} />
              <Route path="/xo/room/:code/play" element={<XoPlay />} />
              <Route path="/xo/room/:code/spectate" element={<XoSpectate />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <footer className="app-footer">
              <span className="muted">// typeracer · play with friends</span>
            </footer>
          </main>
          </XoProvider>
          </HangmanProvider>
        </RaceProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
