import { Request, Response } from "express";
import { emailSignIn } from "./providers/emailSignIn";
import { selectOauthProvider } from "@utils/auth";

export const signInUser = async (req: Request, res: Response) => {
  // Prefer auth type from request body for POST; allow query fallback
  const authType = req.query.authType.toString();
  const oauthResult = selectOauthProvider(authType, req, res);
  if (oauthResult !== null) return oauthResult;
  if (authType === "email") {
    return emailSignIn(req, res);
  } else {
    return res.status(400).json({
      success: false,
      message:
        "Invalid authType parameter; expected 'email'|'google'|'linkedin'",
    });
  }
};
