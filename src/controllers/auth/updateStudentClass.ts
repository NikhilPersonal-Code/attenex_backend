import { eq } from "drizzle-orm";
import { Request, Response } from "express";
import { classes, db, users } from "../../config/database_setup";
import { logger } from "../../utils/logger";

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export const updateStudentClass = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const { className } = req.body;

    // Verify user is authenticated
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - Please login",
      });
    }

    // Verify user is a student
    if (userRole !== "student") {
      return res.status(403).json({
        success: false,
        message: "Only students can update their class",
      });
    }

    // Validate input
    if (
      !className ||
      typeof className !== "string" ||
      className.trim().length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid class name is required",
      });
    }

    // Find classes with matching name (can be multiple teachers with same class name)
    const classRecords = await db
      .select()
      .from(classes)
      .where(eq(classes.name, className.trim()));

    if (classRecords.length > 0) {
      logger.info(`Found ${classRecords.length} class(es) with name: ${className.trim()}`);
    } else {
      logger.info(`No existing class found with name: ${className.trim()}`);
    }

    // Update the student's class name (they will join any lecture with this class name)
    const updatedUser = await db
      .update(users)
      .set({
        className: className.trim(),
      })
      .where(eq(users.id, userId))
      .returning();

    logger.info(`Updated student ${userId} class to: ${className.trim()}`);

    return res.status(200).json({
      success: true,
      message: "Class updated successfully",
      data: {
        user: {
          id: updatedUser[0].id,
          email: updatedUser[0].email,
          name: updatedUser[0].name,
          role: updatedUser[0].role,
          className: className.trim(),
        },
      },
    });
  } catch (error: any) {
    logger.error("Error updating student class:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
