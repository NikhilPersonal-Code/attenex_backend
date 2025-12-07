"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRoutes = void 0;
const resetPassword_1 = require("@controllers/auth/resetPassword");
const sendVerificationEmail_1 = require("@controllers/auth/sendVerificationEmail");
const signInUser_1 = require("@controllers/auth/signInUser");
const signUpUser_1 = require("@controllers/auth/signUpUser");
const updateStudentClass_1 = require("@controllers/auth/updateStudentClass");
const updateUserRole_1 = require("@controllers/auth/updateUserRole");
const verifyUser_1 = require("@controllers/auth/verifyUser");
const auth_1 = require("@middleware/auth");
const asyncHandler_1 = __importDefault(require("@utils/asyncHandler"));
require("dotenv/config");
const express_1 = require("express");
exports.userRoutes = (0, express_1.Router)();
// Use clear, action-based routes and POST for operations that carry a request body
exports.userRoutes.post("/signup", signUpUser_1.signUpUser);
exports.userRoutes.post("/signin", signInUser_1.signInUser);
exports.userRoutes.post("/forgot-password", resetPassword_1.requestPasswordReset); // Request password reset email
exports.userRoutes.post("/verify-reset-token", resetPassword_1.verifyResetToken); // Verify reset token is valid
exports.userRoutes.post("/reset-password", resetPassword_1.resetPassword); // Reset password with token
exports.userRoutes.post("/verify-user", verifyUser_1.verifyUser); // Verify user email
exports.userRoutes.post("/update-role", auth_1.authenticate, updateUserRole_1.updateUserRole); // Update user role (protected route)
exports.userRoutes.post("/send-verification-email", (0, asyncHandler_1.default)(sendVerificationEmail_1.sendVerificationEmailController)); // Update user role (protected route)
exports.userRoutes.post("/update-class", auth_1.authenticate, updateStudentClass_1.updateStudentClass); // Update student class (protected route)
