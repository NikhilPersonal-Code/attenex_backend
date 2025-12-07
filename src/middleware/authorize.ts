import { NextFunction, Response } from "express";
import { AuthRequest } from "./auth";

export const authorizeRole = (requiredRole: "teacher" | "student") => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: "Not authenticated" });
    if (req.user.role !== requiredRole)
      return res.status(403).json({ error: "Forbidden" });
    next();
  };
};
