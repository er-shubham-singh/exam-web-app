import React from "react";
import { Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import CreateQuestion from "./pages/CreateQuestion";
import PaperSubmit from "./pages/PaperSubmit";
import NavBar from "./Component/layout/NavBar";
import ViewPaper from "./pages/ViewPaper";
import Mentor from "./pages/Mentor";
import PaperEvaluation from "./pages/PaperEvaluation";
import AdminCreateEmployee from "./pages/AdminCreateEmployee"; // new admin page
import Login from "./pages/Login";
import Unauthorized from "./pages/Unauthorized";
import ProtectedRoute from "./Component/ProtectedRoute";
import { ToastContainer } from "react-toastify";

const App = () => {
  return (
    <div className="min-h-screen bg-gray-900">
      <ToastContainer position="top-right" />
      <NavBar />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* Public or auth-protected homepage */}
        <Route path="/" element={<Dashboard />} />

        {/* Routes protected by role */}
        <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
          <Route path="/admin/create-employee" element={<AdminCreateEmployee />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={["admin", "mentor"]} />}>
          <Route path="/mentor" element={<Mentor />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={["admin", "evaluator"]} />}>
          <Route path="/evaluate" element={<PaperEvaluation />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={["admin", "mentor", "evaluator", "student"]} />}>
          <Route path="/create/paper" element={<CreateQuestion />} />
          <Route path="/view/paper" element={<ViewPaper />} />
          <Route path="/create-question" element={<CreateQuestion />} />
          <Route path="/submit-paper" element={<PaperSubmit />} />
        </Route>

        {/* Fallbacks or other routes... */}
      </Routes>
    </div>
  );
};

export default App;
