import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthProvider";
import { RaceProvider } from "./race/RaceProvider";
import { Landing } from "./screens/Landing";
import { Lobby } from "./screens/Lobby";
import { Race } from "./screens/Race";
import { Results } from "./screens/Results";
import { Login } from "./screens/Login";
import { Register } from "./screens/Register";
import { MyRooms } from "./screens/MyRooms";
import { RoomLeaderboard } from "./screens/RoomLeaderboard";
import { GlobalLeaderboard } from "./screens/GlobalLeaderboard";
import { Training } from "./screens/Training";
import { TrainingHistory } from "./screens/TrainingHistory";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <RaceProvider>
          <main className="app">
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/me/rooms" element={<MyRooms />} />
              <Route path="/me/training" element={<TrainingHistory />} />
              <Route path="/train" element={<Training />} />
              <Route path="/leaderboard" element={<GlobalLeaderboard />} />
              <Route path="/room/:code" element={<Lobby />} />
              <Route path="/room/:code/race" element={<Race />} />
              <Route path="/room/:code/results" element={<Results />} />
              <Route path="/room/:code/leaderboard" element={<RoomLeaderboard />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <footer className="app-footer">
              <span className="muted">// typeracer · play with friends</span>
            </footer>
          </main>
        </RaceProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
