// middleware/authorize.js

// role-based
export const requireRole = (roles = []) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: "Not authenticated" });
  if (!roles.includes(req.user.role)) return res.status(403).json({ message: "Forbidden" });
  next();
};

// flag-based (like allowedCreatePaper)
export const requireFlag = (flagName) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: "Not authenticated" });
  if (!req.user[flagName]) return res.status(403).json({ message: `Forbidden - ${flagName} required` });
  next();
};
