import { and, eq } from "drizzle-orm";
import { Request, Response } from "express";
import { attendance, db, lectures, users } from "../../config/database_setup";
import { logger } from "../../utils/logger";

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export const fetchLectureAttendance = async (
  req: AuthRequest,
  res: Response
) => {
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
        message: "Only teachers can fetch attendance records",
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
        message: "Lecture not found or you don't have permission to view it",
      });
    }

    // Fetch attendance records with student details
    const attendanceRecords = await db
      .select({
        id: attendance.id,
        studentId: attendance.studentId,
        studentName: users.name,
        studentEmail: users.email,
        studentRollNo: users.rollNo,
        joinTime: attendance.joinTime,
        submitTime: attendance.submitTime,
        status: attendance.status,
        checkScore: attendance.checkScore,
        method: attendance.method,
        locationSnapshot: attendance.locationSnapshot,
      })
      .from(attendance)
      .leftJoin(users, eq(attendance.studentId, users.id))
      .where(eq(attendance.lectureId, lectureId));

    logger.info(
      `Fetched ${attendanceRecords.length} attendance records for lecture: ${lectureId}`
    );

    return res.status(200).json({
      success: true,
      data: {
        lectureId,
        attendanceCount: attendanceRecords.length,
        attendance: attendanceRecords,
      },
    });
  } catch (error: any) {
    logger.error("Error fetching lecture attendance:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
