"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyUser = void 0;
const database_setup_1 = require("@config/database_setup");
const logger_1 = require("@utils/logger");
const drizzle_orm_1 = require("drizzle-orm");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const verifyUser = async (req, res) => {
    try {
        const { email, token } = req.body;
        if (!email || !token) {
            return res.status(400).json({
                success: false,
                message: "Email and token are required",
            });
        }
        const [user] = await database_setup_1.db
            .select()
            .from(database_setup_1.users)
            .where((0, drizzle_orm_1.eq)(database_setup_1.users.email, email))
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
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || "secret");
        logger_1.logger.info("Decoded verification token:", decoded);
        if (decoded.userId !== user.id) {
            return res.status(400).json({
                success: false,
                message: "Invalid verification token",
            });
        }
        if (decoded.type !== "email_verify") {
            return res.status(400).json({
                success: false,
                message: "Invalid verification token",
            });
        }
        await database_setup_1.db
            .update(database_setup_1.users)
            .set({ isVerified: true, })
            .where((0, drizzle_orm_1.eq)(database_setup_1.users.email, email));
        return res.status(200).json({
            success: true,
            message: "User verified successfully",
        });
    }
    catch (error) {
        logger_1.logger.error("Error verifying user:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.verifyUser = verifyUser;
