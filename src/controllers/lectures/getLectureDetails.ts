import { and, eq, notInArray, sql } from "drizzle-orm";
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

export const getLectureDetails = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { lectureId } = req.params;

    // Get lecture details
    const lecture = await db.query.lectures.findFirst({
      where: eq(lectures.id, lectureId),
    });

    if (!lecture) {
      return res
        .status(404)
        .json({ success: false, message: "Lecture not found" });
    }

    // Count students who joined this lecture
    const studentCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(attendance)
      .where(eq(attendance.lectureId, lectureId));

    const presentCount = studentCount[0]?.count || 0;

    // Count total students in this class
    const totalStudentsInClass = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(
        and(eq(users.className, lecture.className), eq(users.role, "student"))
      );

    const totalClassStudents = totalStudentsInClass[0]?.count || 0;
    const absentCount = totalClassStudents - presentCount;

    // Get list of students who attended
    const attendedStudentIds = await db
      .select({ studentId: attendance.studentId })
      .from(attendance)
      .where(eq(attendance.lectureId, lectureId));

    const attendedIds = attendedStudentIds.map((a) => a.studentId);

    // Get absent students (students in class who didn't join)
    let absentStudents: any[] = [];
    if (attendedIds.length > 0) {
      absentStudents = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          rollNo: users.rollNo,
        })
        .from(users)
        .where(
          and(
            eq(users.className, lecture.className),
            eq(users.role, "student"),
            notInArray(users.id, attendedIds)
          )
        );
    } else {
      // If no one attended, all students are absent
      absentStudents = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          rollNo: users.rollNo,
        })
        .from(users)
        .where(
          and(eq(users.className, lecture.className), eq(users.role, "student"))
        );
    }

    return res.status(200).json({
      success: true,
      data: {
        lecture,
        studentCount: presentCount,
        totalClassStudents,
        absentCount,
        absentStudents,
      },
    });
  } catch (error: any) {
    logger.error("Get lecture details error", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
