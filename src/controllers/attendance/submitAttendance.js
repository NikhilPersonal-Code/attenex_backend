"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitAttendance = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const database_setup_1 = require("../../config/database_setup");
const location_1 = require("../../utils/location");
const logger_1 = require("../../utils/logger");
const submitAttendance = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ success: false, message: "Unauthorized" });
        const { lectureId, latitude, longitude, passcode } = req.body;
        if (!lectureId || !latitude || !longitude || !passcode) {
            return res
                .status(400)
                .json({ success: false, message: "Missing parameters" });
        }
        // Get lecture
        const lecture = await database_setup_1.db.query.lectures.findFirst({
            where: (0, drizzle_orm_1.eq)(database_setup_1.lectures.id, lectureId),
        });
        if (!lecture)
            return res
                .status(404)
                .json({ success: false, message: "Lecture not found" });
        // Validate passcode
        if (lecture.passcode !== passcode) {
            return res.status(403).json({
                success: false,
                message: "Invalid passcode. Please enter the correct code from your teacher.",
            });
        }
        // Verify Location
        const distance = (0, location_1.calculateDistance)(parseFloat(latitude), parseFloat(longitude), parseFloat(lecture.teacherLatitude), parseFloat(lecture.teacherLongitude));
        const radius = parseFloat(lecture.geofenceRadius || "200");
        if (distance > radius) {
            return res.status(403).json({
                success: false,
                message: `You are too far from the class (${Math.round(distance)}m).`,
            });
        }
        // Get attendance record to check score
        const attendanceRecord = await database_setup_1.db.query.attendance.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(database_setup_1.attendance.lectureId, lectureId), (0, drizzle_orm_1.eq)(database_setup_1.attendance.studentId, userId)),
        });
        if (!attendanceRecord) {
            return res.status(400).json({
                success: false,
                message: "You have not joined this lecture yet.",
            });
        }
        // Get all valid pings for this student in this lecture to verify presence over time
        const pings = await database_setup_1.db.query.attendancePings.findMany({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(database_setup_1.attendancePings.lectureId, lectureId), (0, drizzle_orm_1.eq)(database_setup_1.attendancePings.studentId, userId), (0, drizzle_orm_1.eq)(database_setup_1.attendancePings.isValid, true)),
            orderBy: (pings, { asc }) => [asc(pings.timestamp)],
        });
        // Calculate lecture duration and segments
        // Use startedAt if available, otherwise createdAt
        const startTime = new Date(lecture.startedAt || lecture.createdAt);
        const endTime = new Date(); // Current time as the end of participation
        const durationMs = endTime.getTime() - startTime.getTime();
        const durationMinutes = durationMs / (1000 * 60);
        let finalStatus = "incomplete";
        let message = "Attendance Incomplete";
        // Helper to check for pings in a time window
        const hasPingInWindow = (startMs, endMs) => {
            const start = new Date(startTime.getTime() + startMs);
            const end = new Date(startTime.getTime() + endMs);
            return pings.some((p) => {
                const t = new Date(p.timestamp);
                return t >= start && t <= end;
            });
        };
        // Define Time Windows
        // Start: First 33% of the duration
        // Middle: Middle 33% of the duration
        // End: Last 33% of the duration
        const oneThird = durationMs / 3;
        const hasStart = hasPingInWindow(0, oneThird);
        const hasMiddle = hasPingInWindow(oneThird, oneThird * 2);
        const hasEnd = hasPingInWindow(oneThird * 2, durationMs);
        const hasAnyPing = pings.length > 0;
        // Logic Refinement:
        // 1. Short Duration (< 10 mins): Any valid ping is sufficient.
        // 2. Medium Duration (< 30 mins): Require Start AND End pings (Middle skipped).
        //    - This handles the "earlier lecture end" case where a middle ping might be missed.
        // 3. Long Duration (>= 30 mins): Require Start AND Middle AND End pings.
        //    - Ensures consistent presence ("no constant movement" out of class).
        if (durationMinutes < 10) {
            if (hasAnyPing) {
                finalStatus = "present";
                message = "Attendance Marked Present!";
            }
            else {
                message = "Attendance Incomplete - No location pings received.";
            }
        }
        else if (durationMinutes < 30) {
            if (hasStart && hasEnd) {
                finalStatus = "present";
                message = "Attendance Marked Present!";
            }
            else {
                message = `Attendance Incomplete - Missing pings. Found: Start=${hasStart}, End=${hasEnd}.`;
            }
        }
        else {
            if (hasStart && hasMiddle && hasEnd) {
                finalStatus = "present";
                message = "Attendance Marked Present!";
            }
            else {
                // Fallback: If middle is missing but Start and End are present, and duration is borderline?
                // Strict adherence to "Start Middle End" for long lectures.
                message = `Attendance Incomplete - Missing pings. Found: Start=${hasStart}, Middle=${hasMiddle}, End=${hasEnd}.`;
            }
        }
        logger_1.logger.info(`Student ${userId} submitting attendance for lecture ${lectureId}. Duration: ${durationMinutes.toFixed(1)}m. Pings: ${pings.length}. Status: ${finalStatus}`);
        // Update Attendance
        const result = await database_setup_1.db
            .update(database_setup_1.attendance)
            .set({
            submitTime: new Date(),
            status: finalStatus,
            checkScore: pings.length.toString(),
            locationSnapshot: { lat: latitude, lng: longitude, accuracy: 0 },
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(database_setup_1.attendance.lectureId, lectureId), (0, drizzle_orm_1.eq)(database_setup_1.attendance.studentId, userId)))
            .returning();
        // Emit socket event to notify teacher about attendance submission
        const io = req.app.get("io");
        if (io) {
            io.to(`lecture-${lectureId}`).emit("attendanceSubmitted", {
                lectureId,
                studentId: userId,
                status: finalStatus,
                checkScore: pings.length,
                submitTime: result[0].submitTime,
            });
            logger_1.logger.info(`Socket event emitted: attendanceSubmitted for lecture-${lectureId}`);
        }
        return res.status(200).json({
            success: true,
            message,
            data: result[0],
        });
    }
    catch (error) {
        logger_1.logger.error("Submit attendance error", error);
        return res
            .status(500)
            .json({ success: false, message: "Internal server error" });
    }
};
exports.submitAttendance = submitAttendance;
