import { useState, useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from '@/components/ui/sonner';
import Dashboard from "@/pages/Dashboard";
import WeekView from "@/pages/WeekView";
import StatsLeaders from "@/pages/StatsLeaders";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/week/:weekNumber" element={<WeekView />} />
          <Route path="/stats-leaders" element={<StatsLeaders />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" />
    </div>
  );
}

export default App;