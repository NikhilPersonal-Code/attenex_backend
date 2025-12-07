import { userRoutes } from "@routes/userRoutes";
import cors from "cors";
import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import attendanceRoutes from "./routes/attendanceRoutes";
import lectureRoutes from "./routes/lectureRoutes";
import { logger } from "./utils/logger";
import asyncHandler from "@utils/asyncHandler";
import "tsconfig-paths/lib/register";

// Validate required environment variables
const requiredEnvVars = [
  "JWT_SECRET",
  "GMAIL_USER",
  "GMAIL_APP_PASSWORD",
  "DATABASE_URL",
];
const missingEnvVars = requiredEnvVars.filter(
  (varName) => !process.env[varName]
);

if (missingEnvVars.length > 0) {
  logger.error(
    `Missing required environment variables: ${missingEnvVars.join(", ")}`
  );
  logger.warn(
    "Email functionality will fail without GMAIL_USER and GMAIL_APP_PASSWORD"
  );
}

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
const app = express();
const httpServer = createServer(app);

// Initialize Socket.IO with CORS
const io = new Server(httpServer, {
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
app.use(cors());

/**
 * JSON Body Parser Middleware
 *
 * Parses incoming JSON payloads in request bodies.
 * Required for API endpoints that receive JSON data (user registration, OAuth callbacks, etc.)
 */
app.use(express.json());

/**
 * User Management Routes
 *
 * Handles user-related operations:
 * - User registration and profile management
 * - Google OAuth user creation/verification
 * - User data retrieval and updates
 */
app.use("/api/users", userRoutes);

/**
 * Lecture Management Routes
 *
 * Handles lecture-related operations:
 * - Lecture creation by teachers
 * - Lecture management (start, end, update)
 * - Passcode generation and refresh
 * - Attendance tracking
 */
app.use("/api/lectures", lectureRoutes);
app.use("/api/attendance", attendanceRoutes);

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
  logger.info(`Client connected: ${socket.id}`);

  // Join a lecture room (both students and teachers)
  socket.on("joinLecture", (lectureId: string) => {
    socket.join(`lecture-${lectureId}`);
    logger.info(`Socket ${socket.id} joined lecture-${lectureId}`);
  });

  // Leave a lecture room
  socket.on("leaveLecture", (lectureId: string) => {
    socket.leave(`lecture-${lectureId}`);
    logger.info(`Socket ${socket.id} left lecture-${lectureId}`);
  });

  socket.on("disconnect", () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

app.get("/no-wrap", async (req, res) => {
  await Promise.reject(new Error("boom - no wrap"));
  res.json({ ok: true });
});

app.get(
  "/wrapped",
  asyncHandler(async (req, res) => {
    await Promise.reject(new Error("boom - wrapped"));
    res.json({ ok: true });
  })
);

/**
 * Server Startup
 *
 * Starts the HTTP server with Socket.IO support on the configured port.
 * Logs the server URL for development convenience.
 */

httpServer.listen(PORT, () => {
  logger.info(`Server is running on port http://localhost:${PORT}`);
});
