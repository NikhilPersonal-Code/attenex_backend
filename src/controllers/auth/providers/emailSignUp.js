"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailSignUp = void 0;
const database_setup_1 = require("@config/database_setup");
const drizzle_orm_1 = require("drizzle-orm");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const email_1 = require("@utils/email");
const logger_1 = require("@utils/logger");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const emailSignUp = async (req, res) => {
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
        const existingUsers = await database_setup_1.db
            .select()
            .from(database_setup_1.users)
            .where((0, drizzle_orm_1.eq)(database_setup_1.users.email, email))
            .limit(1);
        if (existingUsers && existingUsers.length > 0) {
            return res.status(409).json({
                success: false,
                message: "User with this email already exists",
            });
        }
        else {
            // Create user
            const passwordHash = bcryptjs_1.default.hashSync(password, 10); // Hash the password
            const newUser = await database_setup_1.db
                .insert(database_setup_1.users)
                .values({
                name,
                email,
                passwordHash: passwordHash,
                isVerified: false,
            })
                .returning({
                id: database_setup_1.users.id,
                name: database_setup_1.users.name,
                email: database_setup_1.users.email,
                role: database_setup_1.users.role,
                photoUrl: database_setup_1.users.photoUrl,
                isVerified: database_setup_1.users.isVerified,
                createdAt: database_setup_1.users.createdAt,
            });
            const token = jsonwebtoken_1.default.sign({ id: newUser[0].id, role: newUser[0].role }, process.env.JWT_SECRET || "secret", { expiresIn: 10 * 24 * 60 * 60 } // 10 days expiration
            );
            try {
                (0, email_1.sendVerificationEmail)({
                    email: newUser[0].email,
                    id: newUser[0].id,
                    name: newUser[0].name,
                });
            }
            catch (error) {
                logger_1.logger.error(error);
            }
            return res.status(201).json({
                success: true,
                message: "User registered successfully",
                user: {
                    id: newUser[0].id,
                    email: newUser[0].email,
                    name: newUser[0].name,
                    photoUrl: newUser[0].photoUrl,
                    role: newUser[0].role,
                },
                token,
            });
        }
    }
    catch (error) {
        logger_1.logger.error("Registration error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error during registration",
        });
    }
};
exports.emailSignUp = emailSignUp;
