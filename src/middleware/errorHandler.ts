import { ErrorRequestHandler } from "express";
import { logger } from "../utils/logger";

/**
 * Central error handling middleware for express.
 * Normalizes error responses and logs them.
 */
export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  logger.error("Unhandled error:", err);

  const status = err?.status || 500;
  const message = err?.message || "Internal Server Error";

  res.status(status).json({ success: false, message });
};

export default errorHandler;
