import { and, eq } from "drizzle-orm";
import { Request, Response } from "express";
import { attendance, db, lectures, users } from "../../config/database_setup";
import { calculateDistance } from "../../utils/location";
import { logger } from "../../utils/logger";

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export const joinLecture = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    const { lectureId, latitude, longitude, rollNo } = req.body;

    if (!lectureId || !latitude || !longitude) {
      return res
        .status(400)
        .json({ success: false, message: "Missing parameters" });
    }

    // If rollNo is provided, update the user's roll number
    if (rollNo && rollNo.trim()) {
      await db
        .update(users)
        .set({ rollNo: rollNo.trim() })
        .where(eq(users.id, userId));

      logger.info(`Updated roll number for user ${userId}: ${rollNo.trim()}`);
    }

    // Get lecture details
    const lecture = await db.query.lectures.findFirst({
      where: eq(lectures.id, lectureId),
    });

    if (!lecture) {
      return res
        .status(404)
        .json({ success: false, message: "Lecture not found" });
    }

    if (lecture.status !== "active") {
      return res
        .status(400)
        .json({ success: false, message: "Lecture is not active" });
    }

    // Check distance
    const distance = calculateDistance(
      parseFloat(latitude),
      parseFloat(longitude),
      parseFloat(lecture.teacherLatitude!),
      parseFloat(lecture.teacherLongitude!)
    );

    // Log coordinates for debugging
    logger.info(
      `Distance check: Student(${latitude}, ${longitude}) vs Teacher(${lecture.teacherLatitude}, ${lecture.teacherLongitude}) = ${Math.round(distance)}m`
    );

    const radius = parseFloat(lecture.geofenceRadius || "5000");

    if (distance > radius) {
      return res.status(403).json({
        success: false,
        message: `You are too far from the class (${Math.round(distance)}m). Must be within ${radius}m.`,
        debug: {
          studentCoords: { lat: latitude, lng: longitude },
          teacherCoords: {
            lat: lecture.teacherLatitude,
            lng: lecture.teacherLongitude,
          },
          distance: Math.round(distance),
          radius,
        },
      });
    }

    // Get the updated user data to return
    const updatedUser = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    // Check if already joined
    const existingAttendance = await db.query.attendance.findFirst({
      where: and(
        eq(attendance.lectureId, lectureId),
        eq(attendance.studentId, userId)
      ),
    });

    if (existingAttendance) {
      return res.status(200).json({
        success: true,
        message: "Already joined",
        data: existingAttendance,
        user: updatedUser,
      });
    }

    // Create attendance record
    const newAttendance = await db
      .insert(attendance)
      .values({
        lectureId,
        studentId: userId,
        joinTime: new Date(),
        status: "incomplete",
        method: "auto",
        checkScore: "1", // First check passed at join time
      })
      .returning();

    logger.info(
      `Student ${userId} joined lecture ${lectureId} successfully. Initial checkScore: 1`
    );

    // Emit socket event to notify teacher about new student join
    const io = (req as any).app.get("io");
    if (io) {
      io.to(`lecture-${lectureId}`).emit("studentJoined", {
        lectureId,
        studentId: userId,
        studentName: updatedUser?.name || "Unknown",
        joinTime: newAttendance[0].joinTime,
      });
      logger.info(
        `Socket event emitted: studentJoined for lecture-${lectureId}`
      );
    }

    return res.status(200).json({
      success: true,
      message: "Joined successfully",
      data: newAttendance[0],
      user: updatedUser,
    });
  } catch (error: any) {
    logger.error("Join lecture error", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
