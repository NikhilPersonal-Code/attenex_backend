"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailSignIn = void 0;
const database_setup_1 = require("@config/database_setup");
const drizzle_orm_1 = require("drizzle-orm");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const emailSignIn = async (req, res) => {
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
        const existingUsers = await database_setup_1.db
            .select()
            .from(database_setup_1.users)
            .where((0, drizzle_orm_1.eq)(database_setup_1.users.email, email))
            .limit(1);
        if (!existingUsers || existingUsers.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }
        const userFound = existingUsers[0];
        // Compare hashed password
        const passwordMatch = bcryptjs_1.default.compareSync(password, userFound.passwordHash || "");
        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }
        // Generate JWT token
        const token = jsonwebtoken_1.default.sign({ id: userFound.id, role: userFound.role }, process.env.JWT_SECRET || "secret", { expiresIn: 10 * 24 * 60 * 60 } // 10 days expiration
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
    }
    catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error during registration",
        });
    }
};
exports.emailSignIn = emailSignIn;
