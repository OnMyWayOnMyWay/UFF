import { useState, useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import LoadingScreen from "./pages/LoadingScreen";
import Dashboard from "./pages/Dashboard";
import ElitePlayers from "./pages/ElitePlayers";
import PlayerStats from "./pages/PlayerStats";
import Standings from "./pages/Standings";
import Schedule from "./pages/Schedule";
import Playoffs from "./pages/Playoffs";
import Awards from "./pages/Awards";
import Navigation from "./components/Navigation";
import { Toaster } from "./components/ui/sonner";

const AppContent = () => {
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <LoadingScreen onComplete={() => setIsLoading(false)} />;
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="grain-overlay" />
      <main className="pb-24">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/elite" element={<ElitePlayers />} />
          <Route path="/players" element={<PlayerStats />} />
          <Route path="/players/:position" element={<PlayerStats />} />
          <Route path="/standings" element={<Standings />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/playoffs" element={<Playoffs />} />
          <Route path="/awards" element={<Awards />} />
        </Routes>
      </main>
      <Navigation currentPath={location.pathname} />
      <Toaster position="top-right" />
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
