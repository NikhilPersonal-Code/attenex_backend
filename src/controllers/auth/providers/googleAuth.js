"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.googleAuth = void 0;
const database_setup_1 = require("@config/database_setup");
const drizzle_orm_1 = require("drizzle-orm");
const googleAuth = async (req, res) => {
    try {
        const { name, email, oauth_id, oauth_provider, photo_url } = req.body;
        // Validate required fields
        if (!name || !email || !oauth_id || !oauth_provider) {
            return res.status(400).json({
                success: false,
                message: "Name, email, oauth_id, and oauth_provider are required",
            });
        }
        // Check if user already exists
        const existingUser = await database_setup_1.db
            .select()
            .from(database_setup_1.users)
            .where((0, drizzle_orm_1.eq)(database_setup_1.users.email, email))
            .limit(1);
        if (existingUser.length > 0) {
            return res.status(200).json({
                success: true,
                message: "User with this email already exists",
                user: existingUser[0],
            });
        }
        // Create user
        const newUser = await database_setup_1.db
            .insert(database_setup_1.users)
            .values({
            name,
            email,
            oauthId: oauth_id,
            oauthProvider: oauth_provider,
            photoUrl: photo_url || null,
            isVerified: true,
        })
            .returning({
            id: database_setup_1.users.id,
            name: database_setup_1.users.name,
            email: database_setup_1.users.email,
            isVerified: database_setup_1.users.isVerified,
            photoUrl: database_setup_1.users.photoUrl,
            createdAt: database_setup_1.users.createdAt,
        });
        // Return success response (don't send password hash back)
        res.status(201).json({
            success: true,
            message: "User registered successfully",
            user: newUser[0],
        });
    }
    catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error during registration",
        });
    }
};
exports.googleAuth = googleAuth;
