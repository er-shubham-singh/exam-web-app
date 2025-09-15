import React from "react";
import { Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import CreateQuestion from "./pages/CreateQuestion"; // your existing page
import PaperSubmit from "./pages/PaperSubmit";       // your submit page
import NavBar from "./Component/layout/NavBar";
import ViewPaper from "./pages/ViewPaper";
import Mentor from "./pages/Mentor";
import PaperEvaluation from "./pages/PaperEvaluation";

const App = () => {
  return (
    <div className="min-h-screen bg-gray-900">
      <NavBar />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/create/paper" element={<CreateQuestion />} />
        <Route path="/view/paper" element={<ViewPaper />} />
        <Route path="/mentor" element={<Mentor />} />
        <Route path="/evaluate" element={<PaperEvaluation />} />

        {/* existing flows */}
        <Route path="/create-question" element={<CreateQuestion />} />
        <Route path="/submit-paper" element={<PaperSubmit />} />
      </Routes>
    </div>
  );
};

export default App;
