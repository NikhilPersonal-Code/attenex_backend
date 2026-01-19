import { rateLimit } from "express-rate-limit";

export const userRouteLimiter = rateLimit({
  windowMs: 10000,
  standardHeaders: true,
  limit: 15,
  legacyHeaders: false,
});

export const forgotPasswordLimiter = rateLimit({
  windowMs: 10000,
  standardHeaders: true,
  limit: 5,
  legacyHeaders: false,
});
