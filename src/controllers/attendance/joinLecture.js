"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.joinLecture = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const database_setup_1 = require("../../config/database_setup");
const location_1 = require("../../utils/location");
const logger_1 = require("../../utils/logger");
const joinLecture = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ success: false, message: "Unauthorized" });
        const { lectureId, latitude, longitude, rollNo } = req.body;
        if (!lectureId || !latitude || !longitude) {
            return res
                .status(400)
                .json({ success: false, message: "Missing parameters" });
        }
        // If rollNo is provided, update the user's roll number
        if (rollNo && rollNo.trim()) {
            await database_setup_1.db
                .update(database_setup_1.users)
                .set({ rollNo: rollNo.trim() })
                .where((0, drizzle_orm_1.eq)(database_setup_1.users.id, userId));
            logger_1.logger.info(`Updated roll number for user ${userId}: ${rollNo.trim()}`);
        }
        // Get lecture details
        const lecture = await database_setup_1.db.query.lectures.findFirst({
            where: (0, drizzle_orm_1.eq)(database_setup_1.lectures.id, lectureId),
        });
        if (!lecture) {
            return res
                .status(404)
                .json({ success: false, message: "Lecture not found" });
        }
        if (lecture.status !== "active") {
            return res
                .status(400)
                .json({ success: false, message: "Lecture is not active" });
        }
        // Check distance
        const distance = (0, location_1.calculateDistance)(parseFloat(latitude), parseFloat(longitude), parseFloat(lecture.teacherLatitude), parseFloat(lecture.teacherLongitude));
        // Log coordinates for debugging
        logger_1.logger.info(`Distance check: Student(${latitude}, ${longitude}) vs Teacher(${lecture.teacherLatitude}, ${lecture.teacherLongitude}) = ${Math.round(distance)}m`);
        const radius = parseFloat(lecture.geofenceRadius || "5000");
        if (distance > radius) {
            return res.status(403).json({
                success: false,
                message: `You are too far from the class (${Math.round(distance)}m). Must be within ${radius}m.`,
                debug: {
                    studentCoords: { lat: latitude, lng: longitude },
                    teacherCoords: {
                        lat: lecture.teacherLatitude,
                        lng: lecture.teacherLongitude,
                    },
                    distance: Math.round(distance),
                    radius,
                },
            });
        }
        // Get the updated user data to return
        const updatedUser = await database_setup_1.db.query.users.findFirst({
            where: (0, drizzle_orm_1.eq)(database_setup_1.users.id, userId),
        });
        // Check if already joined
        const existingAttendance = await database_setup_1.db.query.attendance.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(database_setup_1.attendance.lectureId, lectureId), (0, drizzle_orm_1.eq)(database_setup_1.attendance.studentId, userId)),
        });
        if (existingAttendance) {
            return res.status(200).json({
                success: true,
                message: "Already joined",
                data: existingAttendance,
                user: updatedUser,
            });
        }
        // Create attendance record
        const newAttendance = await database_setup_1.db
            .insert(database_setup_1.attendance)
            .values({
            lectureId,
            studentId: userId,
            joinTime: new Date(),
            status: "incomplete",
            method: "auto",
            checkScore: "1", // First check passed at join time
        })
            .returning();
        logger_1.logger.info(`Student ${userId} joined lecture ${lectureId} successfully. Initial checkScore: 1`);
        // Emit socket event to notify teacher about new student join
        const io = req.app.get("io");
        if (io) {
            io.to(`lecture-${lectureId}`).emit("studentJoined", {
                lectureId,
                studentId: userId,
                studentName: updatedUser?.name || "Unknown",
                joinTime: newAttendance[0].joinTime,
            });
            logger_1.logger.info(`Socket event emitted: studentJoined for lecture-${lectureId}`);
        }
        return res.status(200).json({
            success: true,
            message: "Joined successfully",
            data: newAttendance[0],
            user: updatedUser,
        });
    }
    catch (error) {
        logger_1.logger.error("Join lecture error", error);
        return res
            .status(500)
            .json({ success: false, message: "Internal server error" });
    }
};
exports.joinLecture = joinLecture;
