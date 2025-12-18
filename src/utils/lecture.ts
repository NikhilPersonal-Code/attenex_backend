import cron from "node-cron";
import { lectureClosure } from "../tasks/lectureClosure";

// For Scheduling The Task To Schedule Lecture End At A Correct Time.

export const scheduleLectureEnd = async (
  lectureId: string,
  durationMinutes: number
) => {
  console.log(durationMinutes);

  const currentDate = new Date();

  let minutes = currentDate.getMinutes();
  let hours = currentDate.getHours();

  const extraHour = Math.floor((minutes + durationMinutes) / 60);
  const extraMinutes = Math.floor(
    (minutes + durationMinutes) % (60 * (extraHour <= 1 ? 1 : extraHour))
  );

  hours += extraHour;
  minutes = extraMinutes;

  const scheduleTimings = `${minutes} ${hours} * * *`;

  console.log(scheduleTimings);

  cron.schedule(scheduleTimings, async () => await lectureClosure(lectureId), {
    maxExecutions: 1,
  });
};
