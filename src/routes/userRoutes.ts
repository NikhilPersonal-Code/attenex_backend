import { deleteUserAccount } from "@controllers/auth/deleteUserAccount";
import {
  requestPasswordReset,
  resetPassword,
  verifyResetToken,
} from "@controllers/auth/resetPassword";
import { sendVerificationEmailController } from "@controllers/auth/sendVerificationEmail";
import { signInUser } from "@controllers/auth/signInUser";
import { signUpUser } from "@controllers/auth/signUpUser";
import { updateStudentClass } from "@controllers/auth/updateStudentClass";
import { updateUserRole } from "@controllers/auth/updateUserRole";
import { verifyUser } from "@controllers/auth/verifyUser";
import { authenticate } from "@middleware/auth";
import asyncHandler from "@utils/asyncHandler";
import "dotenv/config";
import { Router } from "express";

export const userRoutes = Router();

// Use clear, action-based routes and POST for operations that carry a request body
userRoutes.post("/signup", signUpUser);
userRoutes.post("/signin", signInUser);
userRoutes.post("/forgot-password", requestPasswordReset); // Request password reset email
userRoutes.post("/verify-reset-token", verifyResetToken); // Verify reset token is valid
userRoutes.post("/reset-password", resetPassword); // Reset password with token
userRoutes.post("/verify-user", verifyUser); // Verify user email
userRoutes.post("/update-role", authenticate, updateUserRole); // Update user role (protected route)
userRoutes.delete(
  "/delete-account",
  authenticate,
  asyncHandler(deleteUserAccount)
);
userRoutes.post(
  "/send-verification-email",
  asyncHandler(sendVerificationEmailController)
); // Update user role (protected route)
userRoutes.post("/update-class", authenticate, updateStudentClass); // Update student class (protected route)
