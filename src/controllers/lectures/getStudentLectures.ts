import { and, eq } from "drizzle-orm";
import { Request, Response } from "express";
import { classes, db, lectures, users } from "../../config/database_setup";
import { logger } from "../../utils/logger";

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export const getStudentLectures = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;

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
        message: "Only students can fetch their class lectures",
      });
    }

    // Get student's class name
    const student = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (student.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    const studentClassName = student[0].className;

    if (!studentClassName) {
      return res.status(200).json({
        success: true,
        data: [],
        message: "Please set your class first to see available lectures",
      });
    }

    // Get the student's class name
    const studentClass = await db
      .select()
      .from(classes)
      .where(eq(classes.name, studentClassName))
      .limit(1);

    if (studentClass.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        message: "Class not found. Please update your class.",
      });
    }


    // Fetch all active lectures for classes with matching name
    const activeLectures = await db
      .select({
        id: lectures.id,
        title: lectures.title,
        className: classes.name,
        duration: lectures.duration,
        status: lectures.status,
        createdAt: lectures.createdAt,
        startedAt: lectures.startedAt,
        teacherLatitude: lectures.teacherLatitude,
        teacherLongitude: lectures.teacherLongitude,
      })
      .from(lectures)
      .leftJoin(classes, eq(lectures.className, classes.name))
      .where(
        and(eq(classes.name, studentClassName), eq(lectures.status, "active"))
      )
      .orderBy(lectures.createdAt);

    logger.info(
      `Fetched ${activeLectures.length} active lectures for student: ${userId} in class: ${studentClassName}`
    );

    return res.status(200).json({
      success: true,
      data: activeLectures,
    });
  } catch (error: any) {
    logger.error("Error fetching student lectures:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
