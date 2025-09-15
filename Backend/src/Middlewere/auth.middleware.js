// middlewares/auth.js
import jwt from "jsonwebtoken";
import adminPermissionModel from "../Modal/admin.permission.model.js";

export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: "No token provided" });
  const token = authHeader.split(" ")[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await adminPermissionModel.findById(payload.id);
    if (!user) return res.status(401).json({ message: "Invalid token" });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Unauthorized" });
  }
}

export function requireAdmin(req, res, next) {
  // assume requireAuth ran earlier (or call it inside)
  if (!req.user) return res.status(401).json({ message: "Unauthorized" });
  if (req.user.role !== "admin") return res.status(403).json({ message: "Forbidden" });
  next();
}
