import { and, eq } from "drizzle-orm";
import { Request, Response } from "express";
import { classes, db, lectures, users } from "../../config/database_setup";
import { logger } from "../../utils/logger";
import { AuthRequest } from "@middleware/auth";

export const getStudentLecture = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const userRole = req.user?.role;
  const lectureId = req.params.lectureId;

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
      message: "Only students can fetch their class lecture",
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

  logger.info(`Student ${userId} className: ${studentClassName || "NOT SET"}`);

  if (!studentClassName) {
    return res.status(200).json({
      success: true,
      data: [],
      message: "Please set your class first to see available lecture",
    });
  }

  // Find all classes with matching name (can be multiple teachers)
  const matchingClasses = await db
    .select()
    .from(classes)
    .where(eq(classes.name, studentClassName));

  logger.info(
    `Found ${matchingClasses.length} matching classes for name: ${studentClassName}`
  );

  if (matchingClasses.length === 0) {
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
    .leftJoin(classes, eq(lectures.classId, classes.id))
    .where(
      and(
        eq(classes.name, studentClassName),
        eq(lectures.status, "active"),
        eq(lectures.id, lectureId)
      )
    )
    .orderBy(lectures.createdAt);

  return res.status(200).json({
    success: true,
    data: activeLectures[0],
  });
};
