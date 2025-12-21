import { db, users } from "@config/database_setup";
import { eq } from "drizzle-orm";
import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { sendVerificationEmail } from "@utils/email";
import { logger } from "@utils/logger";

export const emailSignUp = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;
    // Validate required fields

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and password are required",
      });
    }
    // Check if user already exists
    const existingUsers = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUsers && existingUsers.length > 0) {
      return res.status(409).json({
        success: false,
        message: "User with this email already exists",
      });
    } else {
      // Create user
      const passwordHash = bcrypt.hashSync(password, 10); // Hash the password

      const newUser = await db
        .insert(users)
        .values({
          name,
          email,
          passwordHash: passwordHash,
          isVerified: false,
        })
        .returning({
          id: users.id,
          name: users.name,
          email: users.email,
        });

      try {
        await sendVerificationEmail({
          email: newUser[0].email,
          id: newUser[0].id,
          name: newUser[0].name,
        });
      } catch (error) {
        logger.error(error);
      }

      return res.status(201).json({
        success: true,
        message: "User registered successfully",
      });
    }
  } catch (error) {
    logger.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error during registration",
    });
  }
};
