import { eq, sql } from "drizzle-orm";
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

    // Count students who joined
    const studentCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(attendance)
      .where(eq(attendance.lectureId, lectureId));

    return res.status(200).json({
      success: true,
      data: {
        lecture,
        studentCount: studentCount[0]?.count || 0,
      },
    });
  } catch (error: any) {
    logger.error("Get lecture details error", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
