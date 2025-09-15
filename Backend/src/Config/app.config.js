import dotenv from "dotenv";

dotenv.config();

const config = {
  port: process.env.PORT || 8000,
  mongoUri: process.env.MONGO_URI,
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
};

export default config;
