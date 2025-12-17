import cron from "node-cron";
import { lectureClosure } from "../tasks/lectureClosure";

export const scheduleLectureEnd = async (
  lectureId: string,
  durationMinutes: number
) => {
  const hours = Math.floor(durationMinutes / 60);
  const minutes = hours === 0 ? durationMinutes : Math.floor(hours % 60);
  cron.schedule(
    `${minutes - 1} ${hours !== 0 ? hours - 1 : "*"} * * *`,
    async () => await lectureClosure(lectureId),
    {
      maxExecutions: 1,
    }
  );
};
