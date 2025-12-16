import { NextFunction, Request, RequestHandler, Response } from "express";

/**
 * Wraps an async express handler and forwards errors to the express error middleware.
 * This removes try/catch duplication from the controller functions.
 */
const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
): RequestHandler => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((err) => {
      try {
        return res
          .json({
            error: "Internal Server Error Occurred",
            message: err.message,
            success: false,
          })
          .status(501);
      } finally {
        throw new Error(err);
      }
    });
  };
};

export default asyncHandler;
