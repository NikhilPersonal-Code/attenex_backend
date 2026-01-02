import { db, users } from "@config/database_setup";
import { eq } from "drizzle-orm";
import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import "dotenv/config";
import { logger } from "@utils/logger";

export interface User {
  role: "teacher" | "student";
  id: string;
}

export interface AuthRequest extends Request {
  user?: User;
}

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this";

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {   
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing authorization header" });
    }
    const token = authHeader.split(" ")[1];
    const payload = jwt.verify(token, JWT_SECRET) as User;

    logger.info("Payload : ", payload);

    // Optional: validate that user still exists in database
    const existingUsers = await db
      .select()
      .from(users)
      .where(eq(users.id, payload.id))
      .limit(1);
    if (!existingUsers && existingUsers.length === 0) {
      return res.status(401).json({ error: "User not found" });
    }

    req.user = existingUsers[0];
    next();
  } catch (_) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};
