// src/Component/ProtectedRoute.jsx
import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";

export default function ProtectedRoute({ allowedRoles = [] }) {
  const auth = useSelector((s) => s.auth || {});
  const { user, token } = auth;

  // not logged in -> redirect to login
  if (!token || !user) return <Navigate to="/login" replace />;

  // if allowedRoles provided and user's role not in it -> unauthorized
  if (Array.isArray(allowedRoles) && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
