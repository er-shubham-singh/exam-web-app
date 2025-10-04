// src/Component/Auth/RequireAuth.jsx
import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

const RequireAuth = () => {
  const location = useLocation();
const token = localStorage.getItem("ACCESS_TOKEN");
const isAuthed = token && token !== "undefined" && token !== "null";
return isAuthed ? <Outlet /> : <Navigate to="/auth/login" replace state={{ from: location }} />;

};

export default RequireAuth;
