import { useState, useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "@/pages/Dashboard";
import WeekView from "@/pages/WeekView";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/week/:weekNumber" element={<WeekView />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;