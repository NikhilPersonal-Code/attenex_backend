import { and, eq } from "drizzle-orm";
import { Request, Response } from "express";
import {
  attendance,
  attendancePings,
  db,
  lectures,
} from "../../config/database_setup";
import { calculateDistance } from "../../utils/location";
import { logger } from "../../utils/logger";

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export const pingLecture = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    const { lectureId, latitude, longitude } = req.body;

    if (!lectureId || !latitude || !longitude) {
      return res
        .status(400)
        .json({ success: false, message: "Missing parameters" });
    }

    // Get lecture details for geofence check
    const lecture = await db.query.lectures.findFirst({
      where: eq(lectures.id, lectureId),
    });

    if (!lecture) {
      return res
        .status(404)
        .json({ success: false, message: "Lecture not found" });
    }

    // Calculate distance
    const distance = calculateDistance(
      parseFloat(latitude),
      parseFloat(longitude),
      parseFloat(lecture.teacherLatitude!),
      parseFloat(lecture.teacherLongitude!)
    );

    const radius = parseFloat(lecture.geofenceRadius || "200");
    const isValid = distance <= radius;

    // Log the ping
    await db.insert(attendancePings).values({
      lectureId,
      studentId: userId,
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      isValid: isValid,
      timestamp: new Date(),
    });

    // If ping is valid, increment the checkScore in attendance table
    if (isValid) {
      const currentAttendance = await db.query.attendance.findFirst({
        where: and(
          eq(attendance.lectureId, lectureId),
          eq(attendance.studentId, userId)
        ),
      });

      if (currentAttendance) {
        const currentScore = parseInt(currentAttendance.checkScore || "0");
        const newScore = Math.min(currentScore + 1, 7); // Cap at 7

        await db
          .update(attendance)
          .set({ checkScore: newScore.toString() })
          .where(
            and(
              eq(attendance.lectureId, lectureId),
              eq(attendance.studentId, userId)
            )
          );

        logger.info(
          `Updated checkScore for student ${userId} in lecture ${lectureId}: ${currentScore} -> ${newScore}`
        );
      }
    }

    return res
      .status(200)
      .json({ success: true, message: "Ping received", isValid });
  } catch (error: any) {
    logger.error("Ping error", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
