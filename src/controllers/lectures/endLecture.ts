import { and, eq } from "drizzle-orm";
import { Request, Response } from "express";
import { attendance, db, lectures } from "../../config/database_setup";
import { logger } from "../../utils/logger";

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export const endLecture = async (req: AuthRequest, res: Response) => {
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
        message: "Only teachers can end lectures",
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
        message: "Lecture not found or you don't have permission to end it",
      });
    }

    const lecture = existingLecture[0];

    // Check if lecture is already ended
    if (lecture.status === "ended") {
      return res.status(400).json({
        success: false,
        message: "Lecture has already been ended",
      });
    }

    // Update lecture status to ended
    const updatedLecture = await db
      .update(lectures)
      .set({
        status: "ended",
        endedAt: new Date(),
      })
      .where(eq(lectures.id, lectureId))
      .returning();

    // Update all incomplete attendance records to absent
    await db
      .update(attendance)
      .set({
        status: "absent",
      })
      .where(
        and(
          eq(attendance.lectureId, lectureId),
          eq(attendance.status, "incomplete")
        )
      );

    logger.info(`Lecture ended: ${lectureId} by teacher: ${userId}`);

    // Emit Socket.IO event to notify all students in the lecture room
    const io = (req as any).app.get("io");
    if (io) {
      io.to(`lecture-${lectureId}`).emit("lectureEnded", {
        lectureId,
        status: "ended",
        endedAt: updatedLecture[0].endedAt,
      });
      logger.info(
        `Socket event emitted: lectureEnded for lecture-${lectureId}`
      );
    }

    return res.status(200).json({
      success: true,
      message: "Lecture ended successfully",
      data: {
        lecture: {
          id: updatedLecture[0].id,
          status: updatedLecture[0].status,
          endedAt: updatedLecture[0].endedAt,
        },
      },
    });
  } catch (error: any) {
    logger.error("Error ending lecture:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
