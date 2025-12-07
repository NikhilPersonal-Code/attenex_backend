"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testConnection = exports.db = exports.attendanceAttemptsRelations = exports.attendanceRelations = exports.lecturesRelations = exports.classesRelations = exports.usersRelations = exports.geofenceLogs = exports.attendancePings = exports.attendance = exports.attendanceAttempts = exports.lectures = exports.classes = exports.users = exports.attendanceMethodEnum = exports.attendanceStatusEnum = exports.lectureStatusEnum = exports.userRoleEnum = void 0;
require("dotenv/config");
const drizzle_orm_1 = require("drizzle-orm");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const pg_core_1 = require("drizzle-orm/pg-core");
const pg_1 = require("pg");
/**
 * Database Schema Configuration for Attenex Attendance Management System
 *
 * This file defines the complete PostgreSQL database schema using Drizzle ORM.
 * The schema supports both traditional authentication (email/password) and OAuth
 * authentication (LinkedIn, Google, etc.) for flexible user onboarding.
 *
 * Key Features:
 * - OAuth integration with provider-specific user identification
 * - Role-based access control (teacher/student)
 * - Geofenced attendance tracking with GPS coordinates
 * - Comprehensive audit trail for attendance attempts
 * - JSON metadata support for extensibility
 */
// ==================== ENUMS ====================
/**
 * User Role Enumeration
 * Defines the two primary user types in the attendance system:
 * - teacher: Can create classes, lectures, and manage attendance
 * - student: Can join classes and mark attendance
 */
exports.userRoleEnum = (0, pg_core_1.pgEnum)("user_role", ["teacher", "student"]);
/**
 * Lecture Status Enumeration
 * Tracks the lifecycle of a lecture session:
 * - active: Lecture is currently running and accepting attendance
 * - ended: Lecture has concluded, no more attendance allowed
 */
exports.lectureStatusEnum = (0, pg_core_1.pgEnum)("lecture_status", ["active", "ended"]);
/**
 * Attendance Status Enumeration
 * Tracks the final status of attendance:
 * - present: Successfully verified at start, end, and during checks
 * - absent: Failed verification or missed too many checks
 * - incomplete: Joined but left early or failed final check
 */
exports.attendanceStatusEnum = (0, pg_core_1.pgEnum)("attendance_status", [
    "present",
    "absent",
    "incomplete",
]);
/**
 * Attendance Method Enumeration
 * Records how attendance was marked:
 * - manual: Teacher manually marked student present
 * - auto: Student used passcode/location to mark attendance
 * - oauth: Attendance marked through OAuth-verified system (future use)
 */
exports.attendanceMethodEnum = (0, pg_core_1.pgEnum)("attendance_method", [
    "manual",
    "auto",
    "oauth",
]);
// ==================== TABLES ====================
/**
 * Users Table - Core user management with OAuth support
 *
 * This table stores all user accounts and supports multiple authentication methods:
 * - Traditional: email + password hash
 * - OAuth: LinkedIn, Google, etc. (oauthProvider + oauthId)
 *
 * OAuth Integration:
 * - oauthProvider: 'linkedin', 'google', etc.
 * - oauthId: Provider's unique user identifier (never changes)
 * - isVerified: OAuth users are pre-verified, traditional users need email verification
 */
exports.users = (0, pg_core_1.pgTable)("users", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    email: (0, pg_core_1.text)("email").notNull().unique(), // Primary identifier, unique across all auth methods
    name: (0, pg_core_1.text)("name"), // Display name, can be updated from OAuth providers
    photoUrl: (0, pg_core_1.text)("photo_url"), // Optional profile photo URL from OAuth or user upload
    role: (0, exports.userRoleEnum)("role"), // teacher or student - determines permissions
    className: (0, pg_core_1.text)("class_name"), // Student's assigned class (null for teachers)
    rollNo: (0, pg_core_1.varchar)("roll_no", { length: 20 }), // Student roll number (unique per class, null for teachers)
    passwordHash: (0, pg_core_1.text)("password_hash"), // Only for traditional auth users (bcrypt hash)
    oauthProvider: (0, pg_core_1.text)("oauth_provider"), // 'linkedin', 'google', etc. - null for traditional auth
    oauthId: (0, pg_core_1.text)("oauth_id"), // Provider's unique user ID - never changes, used for account linking
    isVerified: (0, pg_core_1.boolean)("is_verified").default(false), // Email verified for traditional auth, auto-true for OAuth
    otp: (0, pg_core_1.varchar)("otp", { length: 6 }), // One-time password for email verification
    otpExpiresAt: (0, pg_core_1.timestamp)("otp_expires_at", { withTimezone: true }), // OTP expiration timestamp
    resetToken: (0, pg_core_1.text)("reset_token"), // Password reset token (hashed)
    resetTokenExpiresAt: (0, pg_core_1.timestamp)("reset_token_expires_at", {
        withTimezone: true,
    }), // Reset token expiration
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => [
    (0, pg_core_1.uniqueIndex)("users_email_idx").on(table.email), // Fast email lookups for auth
    (0, pg_core_1.index)("users_role_idx").on(table.role), // Filter users by role
    (0, pg_core_1.index)("users_class_idx").on(table.className), // Find students in a class
    (0, pg_core_1.index)("users_class_rollno_idx").on(table.className, table.rollNo), // Unique roll numbers per class
]);
/**
 * Classes Table - Academic class management
 *
 * Represents a course or class that teachers create and students join.
 * Each class has one teacher and can have multiple students.
 */
exports.classes = (0, pg_core_1.pgTable)("classes", {
    name: (0, pg_core_1.text)("name").notNull().primaryKey(), // Class name (e.g., "Computer Science 101")
    teacherId: (0, pg_core_1.uuid)("teacher_id").references(() => exports.users.id), // Teacher who created the class
    metadata: (0, pg_core_1.jsonb)("metadata"), // Flexible storage for class settings, schedule, etc.
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => [(0, pg_core_1.index)("classes_teacher_idx").on(table.teacherId)] // Find classes by teacher
);
/**
 * Lectures Table - Individual class sessions
 *
 * Each lecture represents a single attendance session within a class.
 * Includes geofencing for location-based attendance and time-limited passcodes.
 */
exports.lectures = (0, pg_core_1.pgTable)("lectures", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    teacherId: (0, pg_core_1.uuid)("teacher_id")
        .references(() => exports.users.id)
        .notNull(), // Teacher conducting the lecture
    className: (0, pg_core_1.text)("class_name")
        .references(() => exports.classes.name)
        .notNull(), // Class this lecture belongs to
    title: (0, pg_core_1.text)("title").notNull(), // Lecture title/topic
    sessionToken: (0, pg_core_1.uuid)("session_token").defaultRandom(), // Unique token for this session
    passcode: (0, pg_core_1.varchar)("passcode", { length: 4 }), // 4-digit passcode that refreshes every 10 seconds
    passcodeUpdatedAt: (0, pg_core_1.timestamp)("passcode_updated_at", { withTimezone: true }), // Last time passcode was refreshed
    duration: (0, pg_core_1.numeric)("duration").default("60").notNull(), // Duration in minutes
    status: (0, exports.lectureStatusEnum)("status").default("active"), // active or ended
    teacherLatitude: (0, pg_core_1.numeric)("teacher_latitude", { precision: 10, scale: 7 }), // GPS coordinates for geofencing
    teacherLongitude: (0, pg_core_1.numeric)("teacher_longitude", { precision: 10, scale: 7 }),
    geofenceRadius: (0, pg_core_1.numeric)("geofence_radius").default("200"), // Geofence radius in meters (increased for GPS accuracy tolerance)
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true }).defaultNow(),
    startedAt: (0, pg_core_1.timestamp)("started_at", { withTimezone: true }), // When lecture actually began
    endedAt: (0, pg_core_1.timestamp)("ended_at", { withTimezone: true }), // When lecture ended
}, (table) => [
    (0, pg_core_1.index)("lectures_teacher_status_idx").on(table.teacherId, table.status), // Active lectures by teacher
    (0, pg_core_1.index)("lectures_class_idx").on(table.className), // Lectures in a class
]);
/**
 * Attendance Attempts Table - Audit trail for all attendance attempts
 *
 * Records every attempt to mark attendance, successful or failed.
 * This provides a complete audit trail and helps with debugging attendance issues.
 * Failed attempts are stored here but don't create attendance records.
 */
exports.attendanceAttempts = (0, pg_core_1.pgTable)("attendance_attempts", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    lectureId: (0, pg_core_1.uuid)("lecture_id")
        .references(() => exports.lectures.id)
        .notNull(), // Which lecture this attempt was for
    studentId: (0, pg_core_1.uuid)("student_id")
        .references(() => exports.users.id)
        .notNull(), // Who attempted to mark attendance
    attemptTime: (0, pg_core_1.timestamp)("attempt_time", { withTimezone: true }).defaultNow(), // When attempt occurred
    distanceMeters: (0, pg_core_1.numeric)("distance_meters"), // How far they were from teacher (for geofencing)
    success: (0, pg_core_1.boolean)("success").notNull(), // Whether the attempt succeeded
    ipAddress: (0, pg_core_1.text)("ip_address"), // Client IP for security/audit
    deviceInfo: (0, pg_core_1.jsonb)("device_info"), // Device details for debugging (OS, browser, etc.)
}, (table) => [
    (0, pg_core_1.index)("attempts_lecture_idx").on(table.lectureId), // Attempts for a lecture
    (0, pg_core_1.index)("attempts_student_idx").on(table.studentId), // Attempts by a student
]);
/**
 * Attendance Table - Successful attendance records
 *
 * Only successful attendance markings are stored here.
 * Each student can only have one attendance record per lecture (enforced by unique constraint).
 */
exports.attendance = (0, pg_core_1.pgTable)("attendance", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    lectureId: (0, pg_core_1.uuid)("lecture_id")
        .references(() => exports.lectures.id)
        .notNull(), // The lecture attended
    studentId: (0, pg_core_1.uuid)("student_id")
        .references(() => exports.users.id)
        .notNull(), // Who attended
    joinTime: (0, pg_core_1.timestamp)("join_time", { withTimezone: true }), // When student first joined
    submitTime: (0, pg_core_1.timestamp)("submit_time", { withTimezone: true }), // When final passcode was submitted
    status: (0, exports.attendanceStatusEnum)("status").default("incomplete"), // Final status
    checkScore: (0, pg_core_1.numeric)("check_score").default("0"), // Number of valid presence checks passed
    method: (0, exports.attendanceMethodEnum)("method").default("auto"), // How attendance was marked
    locationSnapshot: (0, pg_core_1.jsonb)("location_snapshot"), // GPS snapshot: { lat, lng, accuracy }
    extra: (0, pg_core_1.jsonb)("extra"), // Additional metadata (future extensibility)
}, (table) => [
    (0, pg_core_1.uniqueIndex)("attendance_unique_idx").on(table.lectureId, table.studentId), // One attendance per student per lecture
    (0, pg_core_1.index)("attendance_lecture_idx").on(table.lectureId), // Attendance for a lecture
    (0, pg_core_1.index)("attendance_student_idx").on(table.studentId), // Attendance by a student
]);
/**
 * Attendance Pings Table - "Silent Guardian" Heartbeats
 *
 * Stores the periodic location checks sent by the student app during the lecture.
 * Used to calculate the 'checkScore' for final attendance verification.
 */
exports.attendancePings = (0, pg_core_1.pgTable)("attendance_pings", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    lectureId: (0, pg_core_1.uuid)("lecture_id")
        .references(() => exports.lectures.id)
        .notNull(),
    studentId: (0, pg_core_1.uuid)("student_id")
        .references(() => exports.users.id)
        .notNull(),
    timestamp: (0, pg_core_1.timestamp)("timestamp", { withTimezone: true }).defaultNow(),
    latitude: (0, pg_core_1.numeric)("latitude", { precision: 10, scale: 7 }),
    longitude: (0, pg_core_1.numeric)("longitude", { precision: 10, scale: 7 }),
    isValid: (0, pg_core_1.boolean)("is_valid").notNull(), // True if within geofence radius
}, (table) => [
    (0, pg_core_1.index)("pings_lecture_student_idx").on(table.lectureId, table.studentId),
]);
/**
 * Geofence Logs Table - Exit/Enter Events
 *
 * Logs when a student leaves or enters the geofence radius during a lecture.
 * Used to detect "Leave and Return" cheating patterns.
 */
exports.geofenceLogs = (0, pg_core_1.pgTable)("geofence_logs", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    lectureId: (0, pg_core_1.uuid)("lecture_id")
        .references(() => exports.lectures.id)
        .notNull(),
    studentId: (0, pg_core_1.uuid)("student_id")
        .references(() => exports.users.id)
        .notNull(),
    eventType: (0, pg_core_1.varchar)("event_type", { length: 10 }).notNull(), // 'EXIT' or 'ENTER'
    timestamp: (0, pg_core_1.timestamp)("timestamp", { withTimezone: true }).defaultNow(),
}, (table) => [
    (0, pg_core_1.index)("geofence_lecture_student_idx").on(table.lectureId, table.studentId),
]);
// ==================== RELATIONS ====================
/**
 * Database Relations Configuration
 *
 * Defines the relationships between tables for Drizzle ORM queries.
 * These relations enable type-safe joins and nested data fetching.
 */
exports.usersRelations = (0, drizzle_orm_1.relations)(exports.users, ({ one, many }) => ({
    class: one(exports.classes, {
        fields: [exports.users.className],
        references: [exports.classes.name],
    }), // Student belongs to one class
    teachingClasses: many(exports.classes), // Teacher can teach many classes
    lecturesAsTeacher: many(exports.lectures), // Teacher conducts many lectures
    attendanceRecords: many(exports.attendance), // Student has many attendance records
    attendanceAttempts: many(exports.attendanceAttempts), // Student has many attempt records
    attendancePings: many(exports.attendancePings),
    geofenceLogs: many(exports.geofenceLogs),
}));
exports.classesRelations = (0, drizzle_orm_1.relations)(exports.classes, ({ one, many }) => ({
    teacher: one(exports.users, {
        fields: [exports.classes.teacherId],
        references: [exports.users.id],
    }), // Class has one teacher
    students: many(exports.users), // Class has many students
    lectures: many(exports.lectures), // Class has many lectures
}));
exports.lecturesRelations = (0, drizzle_orm_1.relations)(exports.lectures, ({ one, many }) => ({
    teacher: one(exports.users, {
        fields: [exports.lectures.teacherId],
        references: [exports.users.id],
    }), // Lecture has one teacher
    class: one(exports.classes, {
        fields: [exports.lectures.className],
        references: [exports.classes.name],
    }), // Lecture belongs to one class
    attendanceRecords: many(exports.attendance), // Lecture has many attendance records
    attendanceAttempts: many(exports.attendanceAttempts), // Lecture has many attempt records
}));
exports.attendanceRelations = (0, drizzle_orm_1.relations)(exports.attendance, ({ one }) => ({
    lecture: one(exports.lectures, {
        fields: [exports.attendance.lectureId],
        references: [exports.lectures.id],
    }), // Attendance belongs to one lecture
    student: one(exports.users, {
        fields: [exports.attendance.studentId],
        references: [exports.users.id],
    }), // Attendance belongs to one student
}));
exports.attendanceAttemptsRelations = (0, drizzle_orm_1.relations)(exports.attendanceAttempts, ({ one }) => ({
    lecture: one(exports.lectures, {
        fields: [exports.attendanceAttempts.lectureId],
        references: [exports.lectures.id],
    }), // Attempt belongs to one lecture
    student: one(exports.users, {
        fields: [exports.attendanceAttempts.studentId],
        references: [exports.users.id],
    }), // Attempt belongs to one student
}));
// ==================== DATABASE CONNECTION ====================
/**
 * PostgreSQL Connection Pool
 *
 * Creates a connection pool for efficient database access.
 * Environment variables configure the connection parameters.
 */
const pool = new pg_1.Pool({
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 5432,
});
/**
 * Drizzle Database Instance
 *
 * Configured Drizzle ORM instance with schema definitions.
 * Provides type-safe database operations and query building.
 */
exports.db = (0, node_postgres_1.drizzle)(pool, {
    schema: {
        users: exports.users,
        classes: exports.classes,
        lectures: exports.lectures,
        attendance: exports.attendance,
        attendanceAttempts: exports.attendanceAttempts,
        attendancePings: exports.attendancePings,
        geofenceLogs: exports.geofenceLogs,
    },
});
/**
 * Database Connection Test
 *
 * Utility function to verify database connectivity.
 * Should be called during application startup.
 */
const testConnection = async () => {
    try {
        const result = await exports.db.execute("SELECT 1 as connected");
        console.log("✅ Database connected successfully");
        return result;
    }
    catch (error) {
        console.error("❌ Database connection failed:", error);
        throw error;
    }
};
exports.testConnection = testConnection;
exports.default = exports.db;
