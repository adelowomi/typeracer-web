import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { RaceProvider } from "./race/RaceProvider";
import { Landing } from "./screens/Landing";
import { Lobby } from "./screens/Lobby";
import { Race } from "./screens/Race";
import { Results } from "./screens/Results";

export default function App() {
  return (
    <BrowserRouter>
      <RaceProvider>
        <main className="app">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/room/:code" element={<Lobby />} />
            <Route path="/room/:code/race" element={<Race />} />
            <Route path="/room/:code/results" element={<Results />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <footer className="app-footer">
            <span className="muted">// typeracer · play with friends</span>
          </footer>
        </main>
      </RaceProvider>
    </BrowserRouter>
  );
}
