import db, { users } from "@config/database_setup";
import { AuthRequest } from "@middleware/auth";
import { Request, Response } from "express";

export const updateUserFullName = async (req: AuthRequest, res: Response) => {
  const { fullName } = req.body;
  const userId = req.user.id;

  if (!fullName) {
    return res
      .json({
        success: false,
        message: "Fullname not provided",
      })
      .status(401);
  }

  const dbResponse = await db.update(users).set({
    name: fullName,
  });

  if (dbResponse.rowCount > 0) {
    return res
      .json({
        success: true,
        message: "Fullname is updated",
      })
      .status(200);
  }

  return res
    .json({
      success: false,
      message: "Fullname not updated due to some error kindly try again.",
    })
    .status(500);
};
