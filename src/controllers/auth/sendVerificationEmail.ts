import { db, users } from "@config/database_setup";
import { sendVerificationEmail } from "@utils/email";
import { eq } from "drizzle-orm";
import { Request, Response } from "express";

export const sendVerificationEmailController = async (
  req: Request,
  res: Response
) => {
  const { email } = req.body;

  const user = (await db.select().from(users).where(eq(users.email, email)))[0];

  if (!user) {
    return res
      .json({
        message: "User does not exist",
        success: false,
      })
      .status(400);
  }

  if (user.isVerified) {
    return res
      .json({
        message: "User is already verified kindly sign up",
        success: false,
      })
      .status(400);
  }

  await sendVerificationEmail({
    email: user.email,
    id: user.id,
    name: user.name,
  });

  return res
    .json({
      success: true,
      message: "Email has been sended",
    })
    .status(200);
};
