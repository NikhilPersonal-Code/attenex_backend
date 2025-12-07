import { db, users } from "@config/database_setup";
import { logger } from "@utils/logger";
import { eq } from "drizzle-orm";
import { Request, Response } from "express";
import jwt from "jsonwebtoken";

export const verifyUser = async (req: Request, res: Response) => {
  try {
    const { email, token } = req.body;
    if (!email || !token) {
      return res.status(400).json({
        success: false,
        message: "Email and token are required",
      });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.isVerified) {
        // e70e47ab-fb9e-4e65-9d1a-a4f1d16d44aa
      return res.status(400).json({
        success: false,
        message: "User is already verified",
      });
    }

    const decoded = jwt.verify(
      token,
      (process.env.JWT_SECRET as string) || "secret"
    );

    logger.info("Decoded verification token:", decoded);

    if ((decoded as any).userId !== user.id) {
      return res.status(400).json({
        success: false,
        message: "Invalid verification token",
      });
    }
    if ((decoded as any).type !== "email_verify") {
      return res.status(400).json({
        success: false,
        message: "Invalid verification token",
      });
    }

    await db
      .update(users)
      .set({ isVerified: true,  })
      .where(eq(users.email, email));
    return res.status(200).json({
      success: true,
      message: "User verified successfully",
    });
  } catch (error) {
    logger.error("Error verifying user:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
