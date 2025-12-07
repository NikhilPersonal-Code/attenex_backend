"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserRole = void 0;
const database_setup_1 = require("@config/database_setup");
const drizzle_orm_1 = require("drizzle-orm");
/**
 * Update User Role Controller
 *
 * Updates the user's role to either "teacher" or "student" after authentication.
 * This is typically called after initial signup when the user selects their role.
 *
 * Route: POST /api/users/update-role
 * Auth: Required (JWT)
 * Body: { role: "teacher" | "student" }
 */
const updateUserRole = async (req, res) => {
    try {
        const { role } = req.body;
        const userId = req.user?.id;
        // Validate user is authenticated
        if (!userId) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        // Validate role
        if (!role || !["teacher", "student"].includes(role)) {
            return res.status(400).json({
                error: "Invalid role. Must be either 'teacher' or 'student'",
            });
        }
        // Update user role in database
        const updatedUsers = await database_setup_1.db
            .update(database_setup_1.users)
            .set({
            role: role,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(database_setup_1.users.id, userId))
            .returning();
        if (!updatedUsers.length) {
            return res.status(404).json({ error: "User not found" });
        }
        const updatedUser = updatedUsers[0];
        return res.status(200).json({
            message: "Role updated successfully",
            user: updatedUser,
        });
    }
    catch (error) {
        console.error("Error updating user role:", error);
        return res.status(500).json({
            error: "Failed to update user role. Please try again.",
        });
    }
};
exports.updateUserRole = updateUserRole;
