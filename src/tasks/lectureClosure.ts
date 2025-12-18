import db, { lectures, users } from "@config/database_setup";
import { message } from "@services/firebase";
import { logger } from "@utils/logger";
import { eq } from "drizzle-orm";

export const lectureClosure = async (lectureId: string) => {
  const lecture = (
    await db
      .select({
        endedAt: lectures.endedAt,
        status: lectures.status,
        teacherId: lectures.teacherId,
      })
      .from(lectures)
      .where(eq(lectures.id, lectureId))
      .limit(1)
  )[0];

  logger.info("Lecture Ending JOB Started....");

  if (lecture.status === "ended") return;

  const endedAt = new Date();
  await db.update(lectures).set({ endedAt, status: "ended" });

  const user = (
    await db
      .select({ token: users.deviceToken })
      .from(users)
      .where(eq(users.id, lecture.teacherId))
      .limit(1)
  )[0];

  if (user.token !== "") {
    await message.send({
      token: user.token,
      data: {
        lectureId,
        ended: "true",
        endedAt: endedAt.toDateString(),
      },
    });
  }
};
