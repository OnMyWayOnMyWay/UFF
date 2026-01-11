import { useState } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from '@/components/ui/sonner';
import Sidebar from "@/components/Sidebar";
import AdminPanel from "@/components/AdminPanel";
import NewDashboard from "@/pages/NewDashboard";
import StatsLeaders from "@/pages/StatsLeaders";
import Standings from "@/pages/Standings";
import Schedule from "@/pages/Schedule";
import WeekView from "@/pages/WeekView";
import PlayerProfile from "@/pages/PlayerProfile";
import PlayerComparison from "@/pages/PlayerComparison";
import SeasonAwards from "@/pages/SeasonAwards";
import TeamAnalysis from "@/pages/TeamAnalysis";
import Playoffs from "@/pages/Playoffs";

function App() {
  const [showAdmin, setShowAdmin] = useState(false);

  return (
    <div className="App">
      <BrowserRouter>
        <div className="flex min-h-screen">
          {/* Sidebar */}
          <Sidebar onAdminOpen={() => setShowAdmin(true)} />
          
          {/* Main Content */}
          <div className="flex-1 lg:ml-64">
            <Routes>
              <Route path="/" element={<NewDashboard />} />
              <Route path="/stats-leaders" element={<StatsLeaders />} />
              <Route path="/standings" element={<Standings />} />
              <Route path="/schedule" element={<Schedule />} />
              <Route path="/playoffs" element={<Playoffs />} />
              <Route path="/compare" element={<PlayerComparison />} />
              <Route path="/awards" element={<SeasonAwards />} />
              <Route path="/team/:teamName" element={<TeamAnalysis />} />
              <Route path="/week/:weekNumber" element={<WeekView />} />
              <Route path="/player/:playerName" element={<PlayerProfile />} />
            </Routes>
          </div>
        </div>
        
        {/* Admin Panel Modal */}
        <AdminPanel isOpen={showAdmin} onClose={() => setShowAdmin(false)} />
        
        {/* Toast Notifications */}
        <Toaster position="top-right" />
      </BrowserRouter>
    </div>
  );
}

export default App;