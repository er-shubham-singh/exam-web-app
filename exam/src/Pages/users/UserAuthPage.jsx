import React, { useState } from "react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import LoginForm from "../../Component/Auth/LoginForm";
import RegisterForm from "../../Component/Auth/RegisterForm";
import { useNavigate } from "react-router-dom";

const UserAuthPage = ({ isLoginDefault = true }) => {
  const [isLogin, setIsLogin] = useState(isLoginDefault);
  const navigate = useNavigate();

  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative">
      {/* ✅ Back Button */}
      <button
        onClick={() => navigate("/")}
        className="absolute top-6 left-6 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg shadow"
      >
        ⬅ Back
      </button>

      <div className="bg-slate-800 p-8 rounded-2xl shadow-xl max-w-lg w-full border border-slate-700">
        {isLogin ? (
          <LoginForm onSwitch={() => setIsLogin(false)} />
        ) : (
          <RegisterForm onSwitch={() => setIsLogin(true)} />
        )}
      </div>

      <ToastContainer position="top-center" autoClose={3000} />
    </main>
  );
};

export default UserAuthPage;
