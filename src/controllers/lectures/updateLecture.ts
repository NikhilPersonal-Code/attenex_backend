import { and, eq } from "drizzle-orm";
import { Request, Response } from "express";
import { db, lectures } from "../../config/database_setup";
import { logger } from "../../utils/logger";

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export const updateLecture = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const { lectureId } = req.params;
    const { title, duration } = req.body;

    // Verify user is authenticated
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - Please login",
      });
    }

    // Verify user is a teacher
    if (userRole !== "teacher") {
      return res.status(403).json({
        success: false,
        message: "Only teachers can update lectures",
      });
    }

    if (!lectureId) {
      return res.status(400).json({
        success: false,
        message: "Lecture ID is required",
      });
    }

    // Check if lecture exists and belongs to the teacher
    const existingLecture = await db
      .select()
      .from(lectures)
      .where(and(eq(lectures.id, lectureId), eq(lectures.teacherId, userId)))
      .limit(1);

    if (existingLecture.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Lecture not found or you don't have permission to update it",
      });
    }

    const lecture = existingLecture[0];

    // Check if lecture is already ended
    if (lecture.status === "ended") {
      return res.status(400).json({
        success: false,
        message: "Cannot update an ended lecture",
      });
    }

    // Build update object - only title and duration allowed for active lectures
    const updateData: any = {};

    if (title !== undefined && title.trim().length > 0) {
      updateData.title = title.trim();
    }

    if (duration !== undefined && duration > 0) {
      updateData.duration = duration.toString();
    }

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "No valid fields to update. Only title and duration can be updated.",
      });
    }

    // Update the lecture
    const updatedLecture = await db
      .update(lectures)
      .set(updateData)
      .where(eq(lectures.id, lectureId))
      .returning();

    logger.info(`Lecture updated: ${lectureId} by teacher: ${userId}`);

    return res.status(200).json({
      success: true,
      message: "Lecture updated successfully",
      data: {
        lecture: {
          id: updatedLecture[0].id,
          title: updatedLecture[0].title,
          duration: updatedLecture[0].duration,
          status: updatedLecture[0].status,
        },
      },
    });
  } catch (error: any) {
    logger.error("Error updating lecture:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
