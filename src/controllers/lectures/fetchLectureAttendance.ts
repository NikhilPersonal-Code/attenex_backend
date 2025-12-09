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

    // Get the lecture with class information
    const lecture = await db.query.lectures.findFirst({
      where: eq(lectures.id, lectureId),
      with: {
        class: true,
      },
    });

    const className = lecture?.class?.name;

    if (!className) {
      return res.status(404).json({
        success: false,
        message: "Class information not found for this lecture",
      });
    }

    // Fetch all students in the class
    const allStudentsInClass = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        rollNo: users.rollNo,
      })
      .from(users)
      .where(and(eq(users.className, className), eq(users.role, "student")));

    // Fetch attendance records for this lecture
    const attendanceRecords = await db
      .select({
        id: attendance.id,
        studentId: attendance.studentId,
        joinTime: attendance.joinTime,
        submitTime: attendance.submitTime,
        status: attendance.status,
        checkScore: attendance.checkScore,
        method: attendance.method,
        locationSnapshot: attendance.locationSnapshot,
      })
      .from(attendance)
      .where(eq(attendance.lectureId, lectureId));

    // Create a map of attendance by studentId for quick lookup
    const attendanceMap = new Map(
      attendanceRecords.map((record) => [record.studentId, record])
    );

    // Merge all students with their attendance status
    const completeAttendanceList = allStudentsInClass.map((student) => {
      const attendanceRecord = attendanceMap.get(student.id);

      if (attendanceRecord) {
        // Student has attendance record
        return {
          id: attendanceRecord.id,
          studentId: student.id,
          studentName: student.name,
          studentEmail: student.email,
          studentRollNo: student.rollNo,
          joinTime: attendanceRecord.joinTime,
          submitTime: attendanceRecord.submitTime,
          status: attendanceRecord.status,
          checkScore: attendanceRecord.checkScore,
          method: attendanceRecord.method,
          locationSnapshot: attendanceRecord.locationSnapshot,
        };
      } else {
        // Student was absent
        return {
          id: `absent-${student.id}`, // Unique ID for absent students
          studentId: student.id,
          studentName: student.name,
          studentEmail: student.email,
          studentRollNo: student.rollNo,
          joinTime: null,
          submitTime: null,
          status: "absent" as const,
          checkScore: 0,
          method: "auto" as const,
          locationSnapshot: null,
        };
      }
    });

    logger.info(
      `Fetched attendance for lecture ${lectureId}: ${attendanceRecords.length} present/incomplete, ${
        allStudentsInClass.length - attendanceRecords.length
      } absent`
    );

    return res.status(200).json({
      success: true,
      data: {
        lectureId,
        totalStudents: allStudentsInClass.length,
        attendanceCount: attendanceRecords.length,
        attendance: completeAttendanceList,
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
