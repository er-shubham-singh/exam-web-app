import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { marks_evaluation, mentor, paper_creation, student } from "../assets";
import CategoryDomainModal from "../Modal/CategoryDomainModel";

const Card = ({ title, subtitle, img, onClick }) => (
  <div
    onClick={onClick}
    className="bg-gray-800 cursor-pointer p-8 rounded-2xl shadow-lg border border-gray-700 transition-transform duration-300 hover:scale-105"
  >
    <div className="mb-4">
      <img src={img} alt={title} className="mx-auto filter invert brightness-200 w-24 h-24" />
    </div>
    <h2 className="text-2xl font-semibold text-gray-100 mb-2">{title}</h2>
    <p className="text-gray-400 text-base">{subtitle}</p>
  </div>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const user = useSelector((s) => s.auth?.user);

  // modal states
  const [openCreate, setOpenCreate] = useState(false);
  const [openView, setOpenView] = useState(false);

  // modal proceed handlers
  const onProceedCreate = ({ category, domain }) => {
    setOpenCreate(false);
    navigate(`/create-question?category=${encodeURIComponent(category)}&domain=${domain}`);
  };

  const onProceedView = ({ category, domain }) => {
    setOpenView(false);
    navigate(`/view/paper?category=${encodeURIComponent(category)}&domain=${domain}`);
  };

  // helper to check role inclusion
const canAccess = (allowed = []) => {
  if (!allowed || allowed.length === 0) return true;
  if (!user) return true; // guests see everything
  return allowed.includes(user.role);
};


  return (
    <div className="min-h-[calc(100vh-56px)] bg-gray-900 text-gray-100 flex items-center justify-center p-6">
      <div className="max-w-5xl mx-auto w-full text-center">
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-100 mb-12">
          Access Portal
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Paper Creation -> admin + mentor */}
          {canAccess(["admin", "mentor"]) && (
            <Card
              title="Paper Creation"
              subtitle="Create and manage exam papers"
              img={paper_creation}
              onClick={() => setOpenCreate(true)}
            />
          )}

          {/* View Created Papers -> admin, mentor, evaluator */}
          {canAccess(["admin", "mentor", "evaluator"]) && (
            <Card
              title="View Created Papers"
              subtitle="Browse papers by category & domain"
              img={paper_creation}
              onClick={() => setOpenView(true)}
            />
          )}

          {/* Marks Evaluation -> admin + evaluator */}
          {canAccess(["admin", "evaluator"]) && (
            <Card
              title="Marks Evaluation"
              subtitle="Evaluate and grade submissions"
              img={marks_evaluation}
              onClick={() => navigate("/evaluate")}
            />
          )}

          {/* Mentor -> admin + mentor */}
          {canAccess(["admin", "mentor"]) && (
            <Card
              title="Mentor"
              subtitle="Manage mentoring tasks"
              img={mentor}
              onClick={() => navigate("/mentor")}
            />
          )}

          {/* Student -> all roles including student */}
          {canAccess(["admin", "mentor", "evaluator", "student"]) && (
            <Card
              title="Student"
              subtitle="Student tools and views"
              img={student}
              onClick={() => navigate("/students")}
            />
          )}

          {/* Optional: show Admin tile only to admin */}
          {canAccess(["admin"]) && (
            <Card
              title="Admin"
              subtitle="Manage users & settings"
              img={paper_creation}
              onClick={() => navigate("/admin/create-employee")}
            />
          )}
        </div>

        <p className="text-gray-400 mt-8 text-lg">
          Users can access their option by entering their credentials
        </p>
      </div>

      {/* Modals */}
      <CategoryDomainModal open={openCreate} onClose={() => setOpenCreate(false)} onProceed={onProceedCreate} />
      <CategoryDomainModal open={openView} onClose={() => setOpenView(false)} onProceed={onProceedView} />
    </div>
  );
};

export default Dashboard;
