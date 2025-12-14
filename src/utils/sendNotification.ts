import { getMessaging } from "firebase-admin/messaging";

export const sendNotification = async (
  className: string,
  lectureTitle: string,
  lectureId: string,
  duration: string
) => {
  await getMessaging().send({
    topic: className,
    apns: {
      payload: {
        aps: {
          "mutable-content": 1,
        },
        data: {
          lectureId,
        },
      },
    },
    android: {
      notification: {
        channelId: "high-priority",
        priority: "max",
      },
    },
    notification: {
      body: `Duration ${duration}`,
      title: `Attend ${lectureTitle} Lecture Now !!`,
    },
    data: {
      lectureId,
    },
  });
};
