import db, { lectures } from "@config/database_setup";
import { eq } from "drizzle-orm";

export const lectureClosure = async (lectureId: string) => {
  const lecture = (
    await db
      .select({
        endedAt: lectures.endedAt,
        status: lectures.status,
      })
      .from(lectures)
      .where(eq(lectures.id, lectureId))
      .limit(1)
  )[0];

  if (lecture.status === "ended") return;

  await db.update(lectures).set({ endedAt: new Date(), status: "ended" });

    // TODO: Implement Messaging Logic To Teacher's Phone To Receive Lecture Ended Logic.
    //   message.send({
    //     token: "",
    //     data:{

    //     },
    //   });
};
