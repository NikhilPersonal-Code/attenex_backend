"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteLecture = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const database_setup_1 = require("../../config/database_setup");
const logger_1 = require("../../utils/logger");
const deleteLecture = async (req, res) => {
    try {
        const userId = req.user?.id;
        const userRole = req.user?.role;
        const { lectureId } = req.params;
        // Verify user is authenticated
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized - Please login",
            });
        }
        // Verify user is a teacher
        if (userRole !== "teacher") {
            return res.status(403).json({
                success: false,
                message: "Only teachers can delete lectures",
            });
        }
        if (!lectureId) {
            return res.status(400).json({
                success: false,
                message: "Lecture ID is required",
            });
        }
        // Check if lecture exists and belongs to the teacher
        const existingLecture = await database_setup_1.db
            .select()
            .from(database_setup_1.lectures)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(database_setup_1.lectures.id, lectureId), (0, drizzle_orm_1.eq)(database_setup_1.lectures.teacherId, userId)))
            .limit(1);
        if (existingLecture.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Lecture not found or you don't have permission to delete it",
            });
        }
        // Only allow deleting ended lectures
        if (existingLecture[0].status !== "ended") {
            return res.status(400).json({
                success: false,
                message: "Only ended lectures can be deleted. Please end the lecture first.",
            });
        }
        // Delete all related records first (cascade delete)
        // This ensures referential integrity is maintained
        logger_1.logger.info(`Deleting all related records for lecture: ${lectureId}`);
        // Delete attendance pings
        await database_setup_1.db
            .delete(database_setup_1.attendancePings)
            .where((0, drizzle_orm_1.eq)(database_setup_1.attendancePings.lectureId, lectureId));
        // Delete geofence logs
        await database_setup_1.db.delete(database_setup_1.geofenceLogs).where((0, drizzle_orm_1.eq)(database_setup_1.geofenceLogs.lectureId, lectureId));
        // Delete attendance attempts
        await database_setup_1.db
            .delete(database_setup_1.attendanceAttempts)
            .where((0, drizzle_orm_1.eq)(database_setup_1.attendanceAttempts.lectureId, lectureId));
        // Delete attendance records
        await database_setup_1.db.delete(database_setup_1.attendance).where((0, drizzle_orm_1.eq)(database_setup_1.attendance.lectureId, lectureId));
        // Finally, delete the lecture itself
        await database_setup_1.db.delete(database_setup_1.lectures).where((0, drizzle_orm_1.eq)(database_setup_1.lectures.id, lectureId));
        logger_1.logger.info(`Lecture and all related records deleted: ${lectureId} by teacher: ${userId}`);
        return res.status(200).json({
            success: true,
            message: "Lecture deleted successfully",
            data: {
                lectureId,
            },
        });
    }
    catch (error) {
        logger_1.logger.error("Error deleting lecture:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message,
        });
    }
};
exports.deleteLecture = deleteLecture;
