import { Request, Response } from "express";
import "dotenv/config";
import { emailSignUp } from "./providers/emailSignUp";
import { selectOauthProvider } from "@utils/auth";

export const signUpUser = async (req: Request, res: Response) => {
  // Prefer authType from body (POST), fallback to query string
  const authType = req.query.authType.toString();
  const oauthResult = selectOauthProvider(authType, req, res);
  if (oauthResult !== null) return oauthResult;
  if (authType === "email") {
    return emailSignUp(req, res);
  } else {
    return res.status(400).json({
      success: false,
      message: "Invalid authType parameter",
    });
  }
};
