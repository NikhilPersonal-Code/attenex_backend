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
import { eq } from "drizzle-orm";
import { Response } from "express";

export const deleteUserAccount = async (req: AuthRequest, res: Response) => {
  const userId = req.user.id;

  // Run all deletes in parallel, ignore errors
  await Promise.allSettled([
    db.delete(classes).where(eq(classes.teacherId, userId)),
    db.delete(lectures).where(eq(lectures.teacherId, userId)),
    db
      .delete(attendanceAttempts)
      .where(eq(attendanceAttempts.studentId, userId)),
    db.delete(attendance).where(eq(attendance.studentId, userId)),
    db.delete(attendancePings).where(eq(attendancePings.studentId, userId)),
    db.delete(geofenceLogs).where(eq(geofenceLogs.studentId, userId)),
  ]);
  const deletedUser = await db
    .delete(users)
    .where(eq(users.id, userId))
    .returning();

  if (deletedUser) {
    return res.json({
      success: true,
      message: "User account deleted successfully",
    });
  } else {
    return res.json({
      success: false,
      message: "User account not deleted successfully",
    });
  }
};
