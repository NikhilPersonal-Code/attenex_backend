import "dotenv/config";
import { relations } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import {
  boolean,
  index,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { Pool } from "pg";

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
export const userRoleEnum = pgEnum("user_role", ["teacher", "student"]);

/**
 * Lecture Status Enumeration
 * Tracks the lifecycle of a lecture session:
 * - active: Lecture is currently running and accepting attendance
 * - ended: Lecture has concluded, no more attendance allowed
 */
export const lectureStatusEnum = pgEnum("lecture_status", ["active", "ended"]);

/**
 * Attendance Status Enumeration
 * Tracks the final status of attendance:
 * - present: Successfully verified at start, end, and during checks
 * - absent: Failed verification or missed too many checks
 * - incomplete: Joined but left early or failed final check
 */
export const attendanceStatusEnum = pgEnum("attendance_status", [
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
export const attendanceMethodEnum = pgEnum("attendance_method", [
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
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull().unique(), // Primary identifier, unique across all auth methods
    name: text("name"), // Display name, can be updated from OAuth providers
    photoUrl: text("photo_url"), // Optional profile photo URL from OAuth or user upload
    role: userRoleEnum("role"), // teacher or student - determines permissions
    className: text("class_name"), // Student's assigned class (null for teachers)
    rollNo: varchar("roll_no", { length: 20 }), // Student roll number (unique per class, null for teachers)
    deviceToken: varchar("device_token"),
    passwordHash: text("password_hash"), // Only for traditional auth users (bcrypt hash)
    oauthProvider: text("oauth_provider"), // 'linkedin', 'google', etc. - null for traditional auth
    oauthId: text("oauth_id"), // Provider's unique user ID - never changes, used for account linking
    isVerified: boolean("is_verified").default(false), // Email verified for traditional auth, auto-true for OAuth
    otp: varchar("otp", { length: 6 }), // One-time password for email verification
    otpExpiresAt: timestamp("otp_expires_at", { withTimezone: true }), // OTP expiration timestamp
    resetToken: text("reset_token"), // Password reset token (hashed)
    resetTokenExpiresAt: timestamp("reset_token_expires_at", {
      withTimezone: true,
    }), // Reset token expiration
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    uniqueIndex("users_email_idx").on(table.email), // Fast email lookups for auth
    index("users_role_idx").on(table.role), // Filter users by role
    index("users_class_idx").on(table.className), // Find students in a class
    index("users_class_rollno_idx").on(table.className, table.rollNo), // Unique roll numbers per class
  ]
);

/**
 * Classes Table - Academic class management
 *
 * Represents a course or class that teachers create and students join.
 * Each class has one teacher and can have multiple students.
 * Uses id as primary key with unique constraint on (name, teacherId) to allow same class names for different teachers.
 */
export const classes = pgTable(
  "classes",
  {
    id: uuid("id").primaryKey().defaultRandom(), // Primary key for foreign key references
    name: text("name").notNull(), // Class name (e.g., "Computer Science 101")
    teacherId: uuid("teacher_id")
      .references(() => users.id)
      .notNull(), // Teacher who created the class
    metadata: jsonb("metadata"), // Flexible storage for class settings, schedule, etc.
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => {
    return {
      teacherIdx: index("classes_teacher_idx").on(table.teacherId), // Find classes by teacher
      uniqueNameTeacher: uniqueIndex("classes_name_teacher_idx").on(
        table.name,
        table.teacherId
      ), // Each teacher can have unique class names
    };
  }
);

/**
 * Lectures Table - Individual class sessions
 *
 * Each lecture represents a single attendance session within a class.
 * Includes geofencing for location-based attendance and time-limited passcodes.
 */
export const lectures = pgTable(
  "lectures",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teacherId: uuid("teacher_id")
      .references(() => users.id)
      .notNull(), // Teacher conducting the lecture
    classId: uuid("class_id")
      .references(() => classes.id)
      .notNull(), // Class this lecture belongs to (references class id)
    title: text("title").notNull(), // Lecture title/topic
    sessionToken: uuid("session_token").defaultRandom(), // Unique token for this session
    passcode: varchar("passcode", { length: 4 }), // 4-digit passcode that refreshes every 10 seconds
    passcodeUpdatedAt: timestamp("passcode_updated_at", { withTimezone: true }), // Last time passcode was refreshed
    duration: numeric("duration").default("60").notNull(), // Duration in minutes
    status: lectureStatusEnum("status").default("active"), // active or ended
    teacherLatitude: numeric("teacher_latitude", { precision: 10, scale: 7 }), // GPS coordinates for geofencing
    teacherLongitude: numeric("teacher_longitude", { precision: 10, scale: 7 }),
    geofenceRadius: numeric("geofence_radius").default("200"), // Geofence radius in meters (increased for GPS accuracy tolerance)
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    startedAt: timestamp("started_at", { withTimezone: true }), // When lecture actually began
    endedAt: timestamp("ended_at", { withTimezone: true }), // When lecture ended
  },
  (table) => [
    index("lectures_teacher_status_idx").on(table.teacherId, table.status), // Active lectures by teacher
    index("lectures_class_idx").on(table.classId), // Lectures in a class
  ]
);

/**
 * Attendance Attempts Table - Audit trail for all attendance attempts
 *
 * Records every attempt to mark attendance, successful or failed.
 * This provides a complete audit trail and helps with debugging attendance issues.
 * Failed attempts are stored here but don't create attendance records.
 */
export const attendanceAttempts = pgTable(
  "attendance_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    lectureId: uuid("lecture_id")
      .references(() => lectures.id)
      .notNull(), // Which lecture this attempt was for
    studentId: uuid("student_id")
      .references(() => users.id)
      .notNull(), // Who attempted to mark attendance
    attemptTime: timestamp("attempt_time", { withTimezone: true }).defaultNow(), // When attempt occurred
    distanceMeters: numeric("distance_meters"), // How far they were from teacher (for geofencing)
    success: boolean("success").notNull(), // Whether the attempt succeeded
    ipAddress: text("ip_address"), // Client IP for security/audit
    deviceInfo: jsonb("device_info"), // Device details for debugging (OS, browser, etc.)
  },
  (table) => [
    index("attempts_lecture_idx").on(table.lectureId), // Attempts for a lecture
    index("attempts_student_idx").on(table.studentId), // Attempts by a student
  ]
);

/**
 * Attendance Table - Successful attendance records
 *
 * Only successful attendance markings are stored here.
 * Each student can only have one attendance record per lecture (enforced by unique constraint).
 */
export const attendance = pgTable(
  "attendance",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    lectureId: uuid("lecture_id")
      .references(() => lectures.id)
      .notNull(), // The lecture attended
    studentId: uuid("student_id")
      .references(() => users.id)
      .notNull(), // Who attended
    joinTime: timestamp("join_time", { withTimezone: true }), // When student first joined
    submitTime: timestamp("submit_time", { withTimezone: true }), // When final passcode was submitted
    status: attendanceStatusEnum("status").default("incomplete"), // Final status
    checkScore: numeric("check_score").default("0"), // Number of valid presence checks passed
    method: attendanceMethodEnum("method").default("auto"), // How attendance was marked
    locationSnapshot: jsonb("location_snapshot"), // GPS snapshot: { lat, lng, accuracy }
    extra: jsonb("extra"), // Additional metadata (future extensibility)
  },
  (table) => [
    uniqueIndex("attendance_unique_idx").on(table.lectureId, table.studentId), // One attendance per student per lecture
    index("attendance_lecture_idx").on(table.lectureId), // Attendance for a lecture
    index("attendance_student_idx").on(table.studentId), // Attendance by a student
  ]
);

/**
 * Attendance Pings Table - "Silent Guardian" Heartbeats
 *
 * Stores the periodic location checks sent by the student app during the lecture.
 * Used to calculate the 'checkScore' for final attendance verification.
 */
export const attendancePings = pgTable(
  "attendance_pings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    lectureId: uuid("lecture_id")
      .references(() => lectures.id)
      .notNull(),
    studentId: uuid("student_id")
      .references(() => users.id)
      .notNull(),
    timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow(),
    latitude: numeric("latitude", { precision: 10, scale: 7 }),
    longitude: numeric("longitude", { precision: 10, scale: 7 }),
    isValid: boolean("is_valid").notNull(), // True if within geofence radius
  },
  (table) => [
    index("pings_lecture_student_idx").on(table.lectureId, table.studentId),
  ]
);

/**
 * Geofence Logs Table - Exit/Enter Events
 *
 * Logs when a student leaves or enters the geofence radius during a lecture.
 * Used to detect "Leave and Return" cheating patterns.
 */
export const geofenceLogs = pgTable(
  "geofence_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    lectureId: uuid("lecture_id")
      .references(() => lectures.id)
      .notNull(),
    studentId: uuid("student_id")
      .references(() => users.id)
      .notNull(),
    eventType: varchar("event_type", { length: 10 }).notNull(), // 'EXIT' or 'ENTER'
    timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("geofence_lecture_student_idx").on(table.lectureId, table.studentId),
  ]
);

// ==================== RELATIONS ====================

/**
 * Database Relations Configuration
 *
 * Defines the relationships between tables for Drizzle ORM queries.
 * These relations enable type-safe joins and nested data fetching.
 */

export const usersRelations = relations(users, ({ one, many }) => ({
  class: one(classes, {
    fields: [users.className],
    references: [classes.name],
    relationName: "studentClass",
  }), // Student belongs to one class
  teachingClasses: many(classes), // Teacher can teach many classes
  lecturesAsTeacher: many(lectures), // Teacher conducts many lectures
  attendanceRecords: many(attendance), // Student has many attendance records
  attendanceAttempts: many(attendanceAttempts), // Student has many attempt records
  attendancePings: many(attendancePings),
  geofenceLogs: many(geofenceLogs),
}));

export const classesRelations = relations(classes, ({ one, many }) => ({
  teacher: one(users, {
    fields: [classes.teacherId],
    references: [users.id],
  }), // Class has one teacher
  students: many(users, { relationName: "studentClass" }), // Class has many students
  lectures: many(lectures), // Class has many lectures
}));

export const lecturesRelations = relations(lectures, ({ one, many }) => ({
  teacher: one(users, {
    fields: [lectures.teacherId],
    references: [users.id],
  }), // Lecture has one teacher
  class: one(classes, {
    fields: [lectures.classId],
    references: [classes.id],
  }), // Lecture belongs to one class
  attendanceRecords: many(attendance), // Lecture has many attendance records
  attendanceAttempts: many(attendanceAttempts), // Lecture has many attempt records
}));

export const attendanceRelations = relations(attendance, ({ one }) => ({
  lecture: one(lectures, {
    fields: [attendance.lectureId],
    references: [lectures.id],
  }), // Attendance belongs to one lecture
  student: one(users, {
    fields: [attendance.studentId],
    references: [users.id],
  }), // Attendance belongs to one student
}));

export const attendanceAttemptsRelations = relations(
  attendanceAttempts,
  ({ one }) => ({
    lecture: one(lectures, {
      fields: [attendanceAttempts.lectureId],
      references: [lectures.id],
    }), // Attempt belongs to one lecture
    student: one(users, {
      fields: [attendanceAttempts.studentId],
      references: [users.id],
    }), // Attempt belongs to one student
  })
);

// ==================== DATABASE CONNECTION ====================

/**
 * PostgreSQL Connection Pool
 *
 * Creates a connection pool for efficient database access.
 * Environment variables configure the connection parameters.
 */
const pool = new Pool({
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
export const db = drizzle(pool, {
  schema: {
    users,
    classes,
    lectures,
    attendance,
    attendanceAttempts,
    attendancePings,
    geofenceLogs,
    usersRelations,
    classesRelations,
    lecturesRelations,
    attendanceRelations,
    attendanceAttemptsRelations,
  },
});

/**
 * Database Connection Test
 *
 * Utility function to verify database connectivity.
 * Should be called during application startup.
 */
export const testConnection = async () => {
  try {
    const result = await db.execute("SELECT 1 as connected");
    console.log("✅ Database connected successfully");
    return result;
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    throw error;
  }
};

// ==================== TYPE EXPORTS ====================

/**
 * TypeScript Type Exports
 *
 * Generated types from Drizzle schema definitions.
 * These provide compile-time type safety for database operations.
 */

export type User = typeof users.$inferSelect; // For reading user data
export type NewUser = typeof users.$inferInsert; // For creating new users

export type Class = typeof classes.$inferSelect;
export type NewClass = typeof classes.$inferInsert;

export type Lecture = typeof lectures.$inferSelect;
export type NewLecture = typeof lectures.$inferInsert;

export type Attendance = typeof attendance.$inferSelect;
export type NewAttendance = typeof attendance.$inferInsert;

export type AttendanceAttempt = typeof attendanceAttempts.$inferSelect;
export type NewAttendanceAttempt = typeof attendanceAttempts.$inferInsert;

export default db;
