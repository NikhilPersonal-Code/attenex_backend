"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pingLecture = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const database_setup_1 = require("../../config/database_setup");
const location_1 = require("../../utils/location");
const logger_1 = require("../../utils/logger");
const pingLecture = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ success: false, message: "Unauthorized" });
        const { lectureId, latitude, longitude } = req.body;
        if (!lectureId || !latitude || !longitude) {
            return res
                .status(400)
                .json({ success: false, message: "Missing parameters" });
        }
        // Get lecture details for geofence check
        const lecture = await database_setup_1.db.query.lectures.findFirst({
            where: (0, drizzle_orm_1.eq)(database_setup_1.lectures.id, lectureId),
        });
        if (!lecture) {
            return res
                .status(404)
                .json({ success: false, message: "Lecture not found" });
        }
        // Calculate distance
        const distance = (0, location_1.calculateDistance)(parseFloat(latitude), parseFloat(longitude), parseFloat(lecture.teacherLatitude), parseFloat(lecture.teacherLongitude));
        const radius = parseFloat(lecture.geofenceRadius || "200");
        const isValid = distance <= radius;
        // Log the ping
        await database_setup_1.db.insert(database_setup_1.attendancePings).values({
            lectureId,
            studentId: userId,
            latitude: latitude.toString(),
            longitude: longitude.toString(),
            isValid: isValid,
            timestamp: new Date(),
        });
        // If ping is valid, increment the checkScore in attendance table
        if (isValid) {
            const currentAttendance = await database_setup_1.db.query.attendance.findFirst({
                where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(database_setup_1.attendance.lectureId, lectureId), (0, drizzle_orm_1.eq)(database_setup_1.attendance.studentId, userId)),
            });
            if (currentAttendance) {
                const currentScore = parseInt(currentAttendance.checkScore || "0");
                const newScore = Math.min(currentScore + 1, 7); // Cap at 7
                await database_setup_1.db
                    .update(database_setup_1.attendance)
                    .set({ checkScore: newScore.toString() })
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(database_setup_1.attendance.lectureId, lectureId), (0, drizzle_orm_1.eq)(database_setup_1.attendance.studentId, userId)));
                logger_1.logger.info(`Updated checkScore for student ${userId} in lecture ${lectureId}: ${currentScore} -> ${newScore}`);
            }
        }
        return res
            .status(200)
            .json({ success: true, message: "Ping received", isValid });
    }
    catch (error) {
        logger_1.logger.error("Ping error", error);
        return res
            .status(500)
            .json({ success: false, message: "Internal server error" });
    }
};
exports.pingLecture = pingLecture;
