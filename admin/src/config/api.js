// src/utils/api.js
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URI,
  headers: {
    "Content-Type": "application/json",
  },
});

// 🔹 Request Interceptor
api.interceptors.request.use(
  (config) => {
    // Make sure key matches what you save in login action/reducer
    const token = localStorage.getItem("authToken"); // <--- FIXED
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// src/config/api.js
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token") || localStorage.getItem("authToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});


export default api;
