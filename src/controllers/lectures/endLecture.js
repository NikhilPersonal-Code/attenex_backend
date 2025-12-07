"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.endLecture = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const database_setup_1 = require("../../config/database_setup");
const logger_1 = require("../../utils/logger");
const endLecture = async (req, res) => {
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
                message: "Only teachers can end lectures",
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
                message: "Lecture not found or you don't have permission to end it",
            });
        }
        const lecture = existingLecture[0];
        // Check if lecture is already ended
        if (lecture.status === "ended") {
            return res.status(400).json({
                success: false,
                message: "Lecture has already been ended",
            });
        }
        // Update lecture status to ended
        const updatedLecture = await database_setup_1.db
            .update(database_setup_1.lectures)
            .set({
            status: "ended",
            endedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(database_setup_1.lectures.id, lectureId))
            .returning();
        // Update all incomplete attendance records to absent
        await database_setup_1.db
            .update(database_setup_1.attendance)
            .set({
            status: "absent",
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(database_setup_1.attendance.lectureId, lectureId), (0, drizzle_orm_1.eq)(database_setup_1.attendance.status, "incomplete")));
        logger_1.logger.info(`Lecture ended: ${lectureId} by teacher: ${userId}`);
        // Emit Socket.IO event to notify all students in the lecture room
        const io = req.app.get("io");
        if (io) {
            io.to(`lecture-${lectureId}`).emit("lectureEnded", {
                lectureId,
                status: "ended",
                endedAt: updatedLecture[0].endedAt,
            });
            logger_1.logger.info(`Socket event emitted: lectureEnded for lecture-${lectureId}`);
        }
        return res.status(200).json({
            success: true,
            message: "Lecture ended successfully",
            data: {
                lecture: {
                    id: updatedLecture[0].id,
                    status: updatedLecture[0].status,
                    endedAt: updatedLecture[0].endedAt,
                },
            },
        });
    }
    catch (error) {
        logger_1.logger.error("Error ending lecture:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message,
        });
    }
};
exports.endLecture = endLecture;
