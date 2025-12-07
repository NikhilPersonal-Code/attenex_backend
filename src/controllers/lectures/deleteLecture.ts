import { and, eq } from "drizzle-orm";
import { Request, Response } from "express";
import {
  attendance,
  attendanceAttempts,
  attendancePings,
  db,
  geofenceLogs,
  lectures,
} from "../../config/database_setup";
import { logger } from "../../utils/logger";

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export const deleteLecture = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const { lectureId } = req.params;

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
        message: "Only teachers can delete lectures",
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
        message: "Lecture not found or you don't have permission to delete it",
      });
    }

    // Only allow deleting ended lectures
    if (existingLecture[0].status !== "ended") {
      return res.status(400).json({
        success: false,
        message:
          "Only ended lectures can be deleted. Please end the lecture first.",
      });
    }

    // Delete all related records first (cascade delete)
    // This ensures referential integrity is maintained
    logger.info(`Deleting all related records for lecture: ${lectureId}`);

    // Delete attendance pings
    await db
      .delete(attendancePings)
      .where(eq(attendancePings.lectureId, lectureId));

    // Delete geofence logs
    await db.delete(geofenceLogs).where(eq(geofenceLogs.lectureId, lectureId));

    // Delete attendance attempts
    await db
      .delete(attendanceAttempts)
      .where(eq(attendanceAttempts.lectureId, lectureId));

    // Delete attendance records
    await db.delete(attendance).where(eq(attendance.lectureId, lectureId));

    // Finally, delete the lecture itself
    await db.delete(lectures).where(eq(lectures.id, lectureId));

    logger.info(
      `Lecture and all related records deleted: ${lectureId} by teacher: ${userId}`
    );

    return res.status(200).json({
      success: true,
      message: "Lecture deleted successfully",
      data: {
        lectureId,
      },
    });
  } catch (error: any) {
    logger.error("Error deleting lecture:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
