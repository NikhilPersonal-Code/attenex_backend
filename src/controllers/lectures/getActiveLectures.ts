import { and, eq } from "drizzle-orm";
import { Request, Response } from "express";
import { classes, db, lectures } from "../../config/database_setup";
import { logger } from "../../utils/logger";

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export const getActiveLectures = async (req: AuthRequest, res: Response) => {
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

    // Verify user is a teacher
    if (userRole !== "teacher") {
      return res.status(403).json({
        success: false,
        message: "Only teachers can fetch their active lectures",
      });
    }

    // Fetch all active lectures for this teacher with class information
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
      .fullJoin(classes, eq(lectures.className, classes.name))
      .where(and(eq(lectures.teacherId, userId), eq(lectures.status, "active")))
      .orderBy(lectures.createdAt);

    logger.info(
      `Fetched ${activeLectures.length} active lectures for teacher: ${userId}`
    );

    return res.status(200).json({
      success: true,
      data: activeLectures,
    });
  } catch (error: any) {
    logger.error("Error fetching active lectures:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
