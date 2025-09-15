// Config/auth.js
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";
const JWT_EXPIRES = "3h"; // students can stay logged in 3 hours

export const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
};

export const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};
