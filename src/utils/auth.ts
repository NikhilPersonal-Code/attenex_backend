import { googleAuth } from "@controllers/auth/providers/googleAuth";
import { linkedInAuth } from "@controllers/auth/providers/linkedInAuth";
import { Request, Response } from "express";

export const selectOauthProvider = (
  authType: "google" | "linkedin" | string,
  req: Request,
  res: Response
) => {
  switch (authType) {
    case "google":
      return googleAuth(req, res);
    case "linkedin":
      return linkedInAuth(req, res);
    default:
      return null;
  }
};
