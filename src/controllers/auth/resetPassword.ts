import { db, users } from "@config/database_setup";
import { getTransporter } from "@utils/email";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import "dotenv/config";
import { eq } from "drizzle-orm";
import { Request, Response } from "express";
import nodemailer from "nodemailer";

/**
 * Request Password Reset
 *
 * Sends a password reset email with a secure token link.
 * The token expires after 1 hour for security.
 */
export const requestPasswordReset = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: "Email is required",
      });
    }

    // Find user by email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    // Always return success to prevent email enumeration attacks
    if (!user) {
      return res.status(200).json({
        message: "If that email exists, a reset link has been sent",
      });
    }

    // Only allow password reset for email/password users (not OAuth users)
    if (user.oauthProvider) {
      return res.status(400).json({
        error: `This account uses ${user.oauthProvider} sign-in. Please use ${user.oauthProvider} to access your account.`,
      });
    }

    // Generate secure reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = await bcrypt.hash(resetToken, 10);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    // Save hashed token to database
    await db
      .update(users)
      .set({
        resetToken: hashedToken,
        resetTokenExpiresAt: expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    // Create reset link (deep link for mobile app)
    const resetLink = `https://attenex.vercel.app/auth/reset-password?token=${encodeURIComponent(
      resetToken
    )}&email=${encodeURIComponent(email)}`;

    // Setup email transporter
    const transporter = getTransporter();

    // Send reset email
    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: email,
      subject: "Reset Your Password - Attenex",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
            .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Reset Your Password</h1>
            </div>
            <div class="content">
              <p>Hi ${user.name || "there"},</p>
              <p>We received a request to reset your password for your Attenex account.</p>
              <p>Click the button below to reset your password. This link will expire in <strong>1 hour</strong>.</p>
              <a href="${resetLink}" style="text-align: center;" class="button">Reset Password</a>
              <div class="warning">
                <strong>⚠️ Security Notice:</strong> If you didn't request this password reset, please ignore this email. Your account is secure.
              </div>
              <p>Or copy and paste this link into your mobile browser:</p>
              <a style="word-break: break-all; background: white; padding: 10px; border-radius: 5px; font-size: 12px;">${resetLink}</a>
            </div>
            <div class="footer">
              <p>This is an automated email from Attenex. Please do not reply.</p>
              <p>&copy; ${new Date().getFullYear()} Attenex. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Hi ${
        user.name || "there"
      },\n\nWe received a request to reset your password for your Attenex account.\n\nClick this link to reset your password (expires in 1 hour):\n${resetLink}\n\nIf you didn't request this, please ignore this email.\n\nThanks,\nThe Attenex Team`,
    });

    return res.status(200).json({
      message: "If that email exists, a reset link has been sent",
    });
  } catch (error) {
    console.error("Password reset request error:", error);
    return res.status(500).json({
      error: "Unable to process password reset request. Please try again.",
    });
  }
};

/**
 * Verify Reset Token
 *
 * Validates that a reset token is valid and not expired.
 * Used by frontend to check token before showing reset form.
 */
export const verifyResetToken = async (req: Request, res: Response) => {
  try {
    const { email, token } = req.body;

    if (!email || !token) {
      return res.status(400).json({
        error: "Email and token are required",
      });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user || !user.resetToken || !user.resetTokenExpiresAt) {
      return res.status(400).json({
        error: "Invalid or expired reset link",
      });
    }

    // Check if token is expired
    if (new Date() > new Date(user.resetTokenExpiresAt)) {
      return res.status(400).json({
        error: "Reset link has expired. Please request a new one.",
      });
    }

    // Verify token
    const isValid = await bcrypt.compare(token, user.resetToken);

    if (!isValid) {
      return res.status(400).json({
        error: "Invalid or expired reset link",
      });
    }

    

    return res.status(200).json({
      message: "Token is valid",
      userName: user.name,
    });
  } catch (error) {
    console.error("Token verification error:", error);
    return res.status(500).json({
      error: "Unable to verify reset token",
    });
  }
};

/**
 * Reset Password with Token
 *
 * Updates user password after validating reset token.
 * Clears the reset token after successful password update.
 */
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { email, token, newPassword } = req.body;

    if (!email || !token || !newPassword) {
      return res.status(400).json({
        error: "Email, token, and new password are required",
      });
    }

    // Validate password strength
    if (newPassword.length < 8) {
      return res.status(400).json({
        error: "Password must be at least 8 characters long",
      });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user || !user.resetToken || !user.resetTokenExpiresAt) {
      return res.status(400).json({
        error: "Invalid or expired reset link",
      });
    }
    console.log("i am here 1");

    // Check if token is expired
    if (new Date() > new Date(user.resetTokenExpiresAt)) {
      return res.status(400).json({
        error: "Reset link has expired. Please request a new one.",
      });
    }
    console.log("i am here 2");

    // Verify token
    const isValid = await bcrypt.compare(token, user.resetToken);

    if (!isValid) {
      return res.status(400).json({
        error: "Invalid or expired reset link",
      });
    }
    console.log("i am here 3");

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update password and clear reset token
    await db
      .update(users)
      .set({
        passwordHash,
        resetToken: null,
        resetTokenExpiresAt: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    return res.status(200).json({
      message:
        "Password reset successfully. You can now sign in with your new password.",
    });
  } catch (error) {
    console.error("Password reset error:", error);
    return res.status(500).json({
      error: "Unable to reset password. Please try again.",
    });
  }
};
