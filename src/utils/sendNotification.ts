import { message } from "@services/firebase";

export const sendNotification = async (
  className: string,
  lectureTitle: string,
  lectureId: string,
  duration: string
) => {
  await message.send({
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
      fcmOptions: {
        imageUrl: "https://attenex.vercel.app/notification-attachment.png",
      },
    },
    android: {
      notification: {
        body: `Duration ${duration} Minutes`,
        title: `${lectureTitle} has started`,
        priority: "max",
        channelId:"attenex"
        // defaultLightSettings: true,
        // lightSettings: {
        //   color: "#00AA00",
        //   lightOnDurationMillis: 1000,
        //   lightOffDurationMillis: 500,
        // },
        // imageUrl: "https://attenex.vercel.app/icon.png",
        // imageUrl: "https://attenex.vercel.app/notification-attachment.png",
      },
    },
    data: {
      lectureId,
    },
  });
};
