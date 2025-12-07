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

    // Find or create the class
    let classRecord = await db
      .select()
      .from(classes)
      .where(eq(classes.name, className.trim()))
      .limit(1);

    let exisitingClassName: string;

    if (classRecord.length > 0) {
      exisitingClassName = classRecord[0].name;
      logger.info(`Found existing class: ${exisitingClassName} for student: ${userId}`);
    } else {
      // Create new class with no teacher (student-created class)
      const newClass = await db
        .insert(classes)
        .values({
          name: className.trim(),
          teacherId: null, // Student-created classes have no teacher
        })
        .returning();

      let newClassName = newClass[0].name;
      logger.info(`Created new class: ${newClassName} for student: ${userId}`);
    }

    // Update the student's class
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
