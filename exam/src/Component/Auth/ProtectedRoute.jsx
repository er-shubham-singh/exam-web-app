// src/Component/Auth/ProtectedRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem("studentToken");

  if (!token) {
    // not logged in → redirect to login page
    return <Navigate to="/user" replace />;
  }

  return children; // logged in → show the page
};

export default ProtectedRoute;
