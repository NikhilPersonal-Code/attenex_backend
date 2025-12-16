import db, {
  attendance,
  attendanceAttempts,
  attendancePings,
  classes,
  geofenceLogs,
  lectures,
  users,
} from "@config/database_setup";
import { AuthRequest } from "@middleware/auth";
import { eq, inArray } from "drizzle-orm";
import { Response } from "express";

export const deleteUserAccount = async (req: AuthRequest, res: Response) => {
  const userId = req.user.id;

  try {
    // Step 1: Get all lectures created by this teacher to delete their child records
    const teacherLectures = await db
      .select({ id: lectures.id })
      .from(lectures)
      .where(eq(lectures.teacherId, userId));

    const lectureIds = teacherLectures.map((l) => l.id);

    // Step 2: Delete all records where user is a student
    await Promise.all([
      db.delete(attendancePings).where(eq(attendancePings.studentId, userId)),
      db.delete(geofenceLogs).where(eq(geofenceLogs.studentId, userId)),
      db
        .delete(attendanceAttempts)
        .where(eq(attendanceAttempts.studentId, userId)),
      db.delete(attendance).where(eq(attendance.studentId, userId)),
    ]);

    // Step 3: Delete all records for lectures created by this teacher (from ANY student)
    if (lectureIds.length > 0) {
      await Promise.all([
        db
          .delete(attendancePings)
          .where(inArray(attendancePings.lectureId, lectureIds)),
        db
          .delete(geofenceLogs)
          .where(inArray(geofenceLogs.lectureId, lectureIds)),
        db
          .delete(attendanceAttempts)
          .where(inArray(attendanceAttempts.lectureId, lectureIds)),
        db.delete(attendance).where(inArray(attendance.lectureId, lectureIds)),
      ]);
    }

    // Step 4: Delete lectures created by this teacher
    await db.delete(lectures).where(eq(lectures.teacherId, userId));

    // Step 5: Delete classes created by this teacher
    await db.delete(classes).where(eq(classes.teacherId, userId));

    // Step 4: Finally delete the user
    const deletedUser = await db
      .delete(users)
      .where(eq(users.id, userId))
      .returning();

    if (deletedUser.length > 0) {
      return res.json({
        success: true,
        message: "User account deleted successfully",
      });
    } else {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
  } catch (error) {
    console.error("Error deleting user account:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete user account",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
