"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const userRoutes_1 = require("@routes/userRoutes");
const cors_1 = __importDefault(require("cors"));
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const attendanceRoutes_1 = __importDefault(require("./routes/attendanceRoutes"));
const lectureRoutes_1 = __importDefault(require("./routes/lectureRoutes"));
const logger_1 = require("./utils/logger");
const asyncHandler_1 = __importDefault(require("@utils/asyncHandler"));
/**
 * Attenex Backend Server
 *
 * Express.js server with Socket.IO for real-time updates in the Attenex attendance management system.
 * Provides REST API endpoints and WebSocket connections for instant lecture status updates.
 *
 * Authentication Methods:
 * - Traditional: Email/password with bcrypt hashing and JWT tokens
 * - OAuth: Google Sign-In (mobile native) and LinkedIn OAuth (WebView-based)
 *
 * Real-time Features:
 * - Socket.IO for instant lecture status updates
 * - Room-based messaging (lecture-specific channels)
 * - Automatic client updates when lectures end
 *
 * Security Features:
 * - CORS enabled for cross-origin requests from React Native app
 * - JSON body parsing for API requests
 * - JWT-based session management
 * - Server-side OAuth token exchange (client secrets never exposed)
 *
 * API Routes:
 * - /api/users: User management (registration, profile updates)
 * - /api/auth: Authentication endpoints (LinkedIn OAuth, Google auth)
 * - /api/lectures: Lecture management
 * - /api/attendance: Attendance tracking
 */
// Initialize Express application
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
// Initialize Socket.IO with CORS
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: "*", // Configure specific origins in production
        methods: ["GET", "POST"],
    },
});
// Make io accessible to routes
app.set("io", io);
// Server configuration
const PORT = process.env.PORT || 5000;
/**
 * CORS Middleware
 *
 * Enables Cross-Origin Resource Sharing to allow requests from the React Native app.
 * In production, configure specific origins for security.
 */
app.use((0, cors_1.default)());
/**
 * JSON Body Parser Middleware
 *
 * Parses incoming JSON payloads in request bodies.
 * Required for API endpoints that receive JSON data (user registration, OAuth callbacks, etc.)
 */
app.use(express_1.default.json());
/**
 * User Management Routes
 *
 * Handles user-related operations:
 * - User registration and profile management
 * - Google OAuth user creation/verification
 * - User data retrieval and updates
 */
app.use("/api/users", userRoutes_1.userRoutes);
/**
 * Lecture Management Routes
 *
 * Handles lecture-related operations:
 * - Lecture creation by teachers
 * - Lecture management (start, end, update)
 * - Passcode generation and refresh
 * - Attendance tracking
 */
app.use("/api/lectures", lectureRoutes_1.default);
app.use("/api/attendance", attendanceRoutes_1.default);
/**
 * Authentication Routes
 *
 * Handles all authentication-related operations:
 * - LinkedIn OAuth: Complete OAuth 2.0 flow with WebView integration
 *   - POST /api/auth/linkedin: Exchange authorization code for user session
 *   - Server-side token exchange ensures client secret security
 *   - Creates/updates user accounts with LinkedIn profile data
 *   - Returns JWT tokens for session management
 *
 * Security Note: LinkedIn client secret is stored server-side only,
 * never exposed to mobile clients.
 */
/**
 * Socket.IO Connection Handler
 *
 * Handles real-time WebSocket connections for instant updates:
 * - Students and teachers join lecture rooms to receive status updates
 * - Server emits events for lecture lifecycle (ended, passcode refresh)
 * - Server emits events for student activity (join, attendance submission)
 * - Eliminates need for polling, reduces server load
 */
io.on("connection", (socket) => {
    logger_1.logger.info(`Client connected: ${socket.id}`);
    // Join a lecture room (both students and teachers)
    socket.on("joinLecture", (lectureId) => {
        socket.join(`lecture-${lectureId}`);
        logger_1.logger.info(`Socket ${socket.id} joined lecture-${lectureId}`);
    });
    // Leave a lecture room
    socket.on("leaveLecture", (lectureId) => {
        socket.leave(`lecture-${lectureId}`);
        logger_1.logger.info(`Socket ${socket.id} left lecture-${lectureId}`);
    });
    socket.on("disconnect", () => {
        logger_1.logger.info(`Client disconnected: ${socket.id}`);
    });
});
app.get("/no-wrap", async (req, res) => {
    await Promise.reject(new Error("boom - no wrap"));
    res.json({ ok: true });
});
app.get("/wrapped", (0, asyncHandler_1.default)(async (req, res) => {
    await Promise.reject(new Error("boom - wrapped"));
    res.json({ ok: true });
}));
/**
 * Server Startup
 *
 * Starts the HTTP server with Socket.IO support on the configured port.
 * Logs the server URL for development convenience.
 */
httpServer.listen(PORT, () => {
    logger_1.logger.info(`Server is running on port http://localhost:${PORT}`);
});
