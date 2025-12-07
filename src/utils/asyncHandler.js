"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Wraps an async express handler and forwards errors to the express error middleware.
 * This removes try/catch duplication from the controller functions.
 */
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch((err) => {
            try {
                return res
                    .json({
                    error: "Internal Server Error Occurred",
                })
                    .status(501);
            }
            finally {
                throw new Error(err);
            }
        });
    };
};
exports.default = asyncHandler;
