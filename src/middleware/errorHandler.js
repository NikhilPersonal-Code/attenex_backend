"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const logger_1 = require("../utils/logger");
/**
 * Central error handling middleware for express.
 * Normalizes error responses and logs them.
 */
const errorHandler = (err, req, res, next) => {
    logger_1.logger.error("Unhandled error:", err);
    const status = err?.status || 500;
    const message = err?.message || "Internal Server Error";
    res.status(status).json({ success: false, message });
};
exports.errorHandler = errorHandler;
exports.default = exports.errorHandler;
