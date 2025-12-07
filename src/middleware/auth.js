"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = void 0;
const database_setup_1 = require("@config/database_setup");
const drizzle_orm_1 = require("drizzle-orm");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
require("dotenv/config");
const logger_1 = require("@utils/logger");
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this";
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ error: "Missing authorization header" });
        }
        const token = authHeader.split(" ")[1];
        const payload = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        logger_1.logger.info("Payload : ", payload);
        // Optional: validate that user still exists in database
        const existingUsers = await database_setup_1.db
            .select()
            .from(database_setup_1.users)
            .where((0, drizzle_orm_1.eq)(database_setup_1.users.id, payload.id))
            .limit(1);
        if (!existingUsers?.length) {
            return res.status(401).json({ error: "User not found" });
        }
        req.user = existingUsers[0];
        next();
    }
    catch (_) {
        return res.status(401).json({ error: "Invalid or expired token" });
    }
};
exports.authenticate = authenticate;
