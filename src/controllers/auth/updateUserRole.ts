import { db, users } from "@config/database_setup";
import { AuthRequest } from "@middleware/auth";
import { eq } from "drizzle-orm";
import { Response } from "express";

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
export const updateUserRole = async (req: AuthRequest, res: Response) => {
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
    const updatedUsers = await db
      .update(users)
      .set({
        role: role as "teacher" | "student",
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    if (!updatedUsers.length) {
      return res.status(404).json({ error: "User not found" });
    }

    const updatedUser = updatedUsers[0];

    return res.status(200).json({
      message: "Role updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error updating user role:", error);
    return res.status(500).json({
      error: "Failed to update user role. Please try again.",
    });
  }
};
