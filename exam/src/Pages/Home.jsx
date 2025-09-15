import React from "react";
import { useNavigate } from "react-router-dom";

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center p-4 sm:p-8 font-sans">
      <div className="max-w-5xl mx-auto w-full text-center">
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-100 mb-12">
          Welcome to the Portal
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Login Card */}
          <div
            onClick={() => navigate("/auth/login")}
            className="cursor-pointer bg-gray-800 p-8 rounded-2xl shadow-lg border border-gray-700 transition-transform duration-300 hover:scale-105 transform"
          >
            <div className="mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="mx-auto w-24 h-24 text-gray-400"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                viewBox="0 0 24 24"
              >
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-gray-100 mb-2">Login</h2>
            <p className="text-gray-400 text-base">Access your account and dashboard.</p>
          </div>

          {/* Register Card */}
          <div
            onClick={() => navigate("/auth/register")}
            className="cursor-pointer bg-gray-800 p-8 rounded-2xl shadow-lg border border-gray-700 transition-transform duration-300 hover:scale-105 transform"
          >
            <div className="mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="mx-auto w-24 h-24 text-gray-400"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                viewBox="0 0 24 24"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="8.5" cy="7" r="4" />
                <line x1="20" y1="8" x2="20" y2="14" />
                <line x1="23" y1="11" x2="17" y2="11" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-gray-100 mb-2">Register</h2>
            <p className="text-gray-400 text-base">Create a new account to get started.</p>
          </div>

          {/* Result View Card */}
          <div
            onClick={() => navigate("/student/result")}
            className="cursor-pointer bg-gray-800 p-8 rounded-2xl shadow-lg border border-gray-700 transition-transform duration-300 hover:scale-105 transform"
          >
            <div className="mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="mx-auto w-24 h-24 text-gray-400"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                viewBox="0 0 24 24"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-gray-100 mb-2">Result View</h2>
            <p className="text-gray-400 text-base">Check your exam results here.</p>
          </div>
        </div>

        <p className="text-gray-400 mt-8 text-lg">Choose an option to continue.</p>
      </div>
    </div>
  );
};

export default Home;
