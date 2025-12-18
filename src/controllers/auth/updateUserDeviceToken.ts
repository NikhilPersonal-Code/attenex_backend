import db, { users } from "@config/database_setup";
import { AuthRequest } from "@middleware/auth";
import { eq } from "drizzle-orm";
import { Response } from "express";

export const updateUserDeviceToken = async (
  req: AuthRequest,
  res: Response
) => {
  const { token } = req.body;
  const user = req.user;

  if (token === null) {
    return res.status(401).json({
      error: "Token field is missing",
    });
  }

  const updatedUser = (
    await db
      .update(users)
      .set({
        deviceToken: token,
      })
      .where(eq(users.id, user.id))
      .returning({
        deviceToken: users.deviceToken,
      })
  )[0];

  if (updatedUser.deviceToken === token) {
    return res.status(200).json({
      success: true,
      message: "Token updated successfully",
    });
  }

  return res.status(500).json({
    success: false,
    message: "Token did not updated successfully",
  });
};
