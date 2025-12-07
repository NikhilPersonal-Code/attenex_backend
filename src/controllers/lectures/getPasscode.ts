import { eq } from "drizzle-orm";
import { Request, Response } from "express";
import { db, lectures } from "../../config/database_setup";
import { logger } from "../../utils/logger";
import { generatePasscode, needsPasscodeRefresh } from "../../utils/passcode";

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export const getPasscode = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { lectureId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!lectureId) {
      return res.status(400).json({
        success: false,
        message: "Lecture ID is required",
      });
    }

    // Get the lecture
    const lecture = await db.query.lectures.findFirst({
      where: eq(lectures.id, lectureId),
    });

    if (!lecture) {
      return res.status(404).json({
        success: false,
        message: "Lecture not found",
      });
    }

    // Verify the user is the teacher
    if (lecture.teacherId !== userId) {
      return res.status(403).json({
        success: false,
        message: "Only the teacher can access the passcode",
      });
    }

    // Check if passcode needs refresh (only for ended lectures)
    let passcode = lecture.passcode;
    let passcodeUpdatedAt = lecture.passcodeUpdatedAt;

    // For ended lectures, only refresh if passcode doesn't exist yet
    // For active lectures (shouldn't happen with new flow, but handle it), don't allow access
    if (lecture.status === "active") {
      return res.status(400).json({
        success: false,
        message: "Passcode is only available after lecture ends",
      });
    }

    if (needsPasscodeRefresh(passcodeUpdatedAt) && lecture.status === "ended") {
      // Generate new passcode
      passcode = generatePasscode();
      passcodeUpdatedAt = new Date();

      // Update in database
      await db
        .update(lectures)
        .set({
          passcode,
          passcodeUpdatedAt,
        })
        .where(eq(lectures.id, lectureId));

      logger.info(`Refreshed passcode for lecture ${lectureId}: ${passcode}`);

      // Emit socket event to notify all connected clients about passcode refresh
      const io = (req as any).app.get("io");
      if (io) {
        io.to(`lecture-${lectureId}`).emit("passcodeRefresh", {
          lectureId,
          passcode,
          updatedAt: passcodeUpdatedAt.toISOString(),
        });
        logger.info(
          `Socket event emitted: passcodeRefresh for lecture-${lectureId}`
        );
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        passcode,
        updatedAt: passcodeUpdatedAt,
      },
    });
  } catch (error: any) {
    logger.error("Get passcode error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
