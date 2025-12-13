import { getMessaging } from "firebase-admin/messaging";

export const sendNotification = async (
  className: string,
  lectureTitle: string,
  duration: string
) => {
  await getMessaging().send({
    topic: className,
    apns: {
      payload: {
        aps: {
          "mutable-content": 1,
        },
      },
    },
    android: {
      notification: {
        channelId: "high-priority",
      },
    },
    notification: {
      body: `Duration ${duration}`,
      title: `Attend ${lectureTitle} Lecture Now !!`,
    },
  });
};
