// pages/Dashboard.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { marks_evaluation, mentor, paper_creation, student } from "../assets";
import CategoryDomainModal from "../Modal/CategoryDomainModel"; // reusing the same modal

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

  // modal for create-paper flow
  const [openCreate, setOpenCreate] = useState(false);
  // modal for view-paper flow
  const [openView, setOpenView] = useState(false);

  // Proceed handlers (same modal, different destinations)
const onProceedCreate = ({ category, domain }) => {
  navigate(`/create-question?category=${encodeURIComponent(category)}&domain=${domain}`);
};


const onProceedView = ({ category, domain }) => {
  navigate(`/view/paper?category=${encodeURIComponent(category)}&domain=${domain}`);
};


  return (
    <div className="min-h-[calc(100vh-56px)] bg-gray-900 text-gray-100 flex items-center justify-center p-6">
      <div className="max-w-5xl mx-auto w-full text-center">
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-100 mb-12">
          Access Portal
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <Card
            title="Paper Creation"
            subtitle="Create and manage exam papers"
            img={paper_creation}
            onClick={() => setOpenCreate(true)}
          />
          <Card
            title="View Created Papers"
            subtitle="Browse papers by category & domain"
            img={paper_creation}
            onClick={() => setOpenView(true)}
          />
          <Card
            title="Marks Evaluation"
            subtitle="Evaluate and grade submissions"
            img={marks_evaluation}
            onClick={() => navigate("/evaluate")}
          />
          <Card
            title="Mentor"
            subtitle="Manage mentoring tasks"
            img={mentor}
            onClick={() => navigate("/mentor")}
          />
          <Card
            title="Student"
            subtitle="Student tools and views"
            img={student}
            onClick={() => navigate("/students")}
          />
        </div>

        <p className="text-gray-400 mt-8 text-lg">
          Users can access their option by entering their credentials
        </p>
      </div>

      {/* Modal for CREATE flow */}
      <CategoryDomainModal
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        onProceed={onProceedCreate}
      />

      {/* Modal for VIEW flow */}
      <CategoryDomainModal
        open={openView}
        onClose={() => setOpenView(false)}
        onProceed={onProceedView}
      />
    </div>
  );
};

export default Dashboard;
