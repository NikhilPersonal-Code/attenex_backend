import { db, users } from "@config/database_setup";
import { eq } from "drizzle-orm";
import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const emailSignIn = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }
    // Find user by email
    const existingUsers = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!existingUsers || existingUsers.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const userFound = existingUsers[0];
    // Compare hashed password
    const passwordMatch = bcrypt.compareSync(
      password,
      userFound.passwordHash || ""
    );
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: userFound.id, role: userFound.role },
      process.env.JWT_SECRET || "secret",
      { expiresIn: 10 * 24 * 60 * 60 } // 10 days expiration
    );

    // Return user info without sensitive fields
    const safeUser = {
      id: userFound.id,
      name: userFound.name,
      email: userFound.email,
      photoUrl: userFound.photoUrl,
      role: userFound.role,
      className: userFound.className,
      isVerified: userFound.isVerified,
      createdAt: userFound.createdAt,
    };

    return res.status(200).json({ success: true, user: safeUser, token });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error during registration",
    });
  }
};
