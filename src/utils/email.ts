import nodemailer from "nodemailer";
import "dotenv/config";
import { logger } from "./logger";
import jwt from "jsonwebtoken";
import axios from "axios";

export const getTransporter = () => {
  // Setup email transporter

  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    secure: true,
    auth: {
      user: process.env.GMAIL_USER!,
      pass: process.env.GMAIL_APP_PASSWORD!,
    },
  });
};

export const sendVerificationEmail = async ({
  email,
  id,
  name,
}: {
  email: string;
  id: string;
  name;
}) => {
  const tokenExpireMinutes = Number(process.env.OTP_EXPIRE_MINUTES || 10);

  const verificationToken = jwt.sign(
    { userId: id, type: "email_verify" },
    (process.env.JWT_SECRET as string) || "secret",
    { expiresIn: `${tokenExpireMinutes}m` }
  );
  const verificationLink = `https://attenex.vercel.app/auth/verify-email?token=${encodeURIComponent(
    verificationToken
  )}&email=${encodeURIComponent(email)}`;

  // Setup email transporter

  // Compose HTML and plain text (match style with reset password email)
  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      body { font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 0; background: #f4f6f8; color: #333; }
      .container { max-width: 680px; margin: 0 auto; }
      .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
      .content { background: #ffffff; padding: 30px; border-radius: 0 0 10px 10px; }
      .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; }
      .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      .small { font-size: 13px; color: #555; }
      .link-box { display: inline-block; background: #f5f7fb; padding: 10px; border-radius: 5px; word-break: break-word; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Verify Your Email</h1>
      </div>
      <div class="content">
        <p class="small">Hi ${name || "Friend"},</p>
        <p>Thanks for signing up for Attenex! Click the button below to verify your email address and complete the registration.</p>
        <p style="text-align:center;">
          <a class="button" href="${verificationLink}">Verify Email</a>
        </p>
        <p class="small">If the button doesn't work, copy and paste the link below into your browser:</p>
        <p class="link-box">${verificationLink}</p>
        <p class="small">This link will expire in <strong>${tokenExpireMinutes} minutes</strong>. If you didn't request this, please ignore this email.</p>
      </div>
      <div class="footer">
        <p>This is an automated email from Attenex. Please do not reply.</p>
        <p>&copy; ${new Date().getFullYear()} Attenex. All rights reserved.</p>
      </div>
    </div>
  </body>
</html>`;

  const text = `Verify your email for Attenex\n\nHi ${
    name || "Friend"
  },\n\nThanks for signing up! Click the link to verify your email: ${verificationLink}\n\nThis link expires in ${tokenExpireMinutes} minutes.\n\nIf you didn't request this, ignore this message.\n\nThanks,\nThe Attenex Team`;

  // Send email (do not block signup; log error if sending fails)
  try {
    await axios.post(`https://attenex-email-backend.vercel.app/send-email`, {
      to: email,
      subject: "Verify your email for Attenex",
      text,
      html,
    });
  } catch (sendError) {
    logger.error("Failed to send verification email:", sendError);
  }
};
