"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateLecture = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const database_setup_1 = require("../../config/database_setup");
const logger_1 = require("../../utils/logger");
const updateLecture = async (req, res) => {
    try {
        const userId = req.user?.id;
        const userRole = req.user?.role;
        const { lectureId } = req.params;
        const { title, duration } = req.body;
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
                message: "Only teachers can update lectures",
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
                message: "Lecture not found or you don't have permission to update it",
            });
        }
        const lecture = existingLecture[0];
        // Check if lecture is already ended
        if (lecture.status === "ended") {
            return res.status(400).json({
                success: false,
                message: "Cannot update an ended lecture",
            });
        }
        // Build update object - only title and duration allowed for active lectures
        const updateData = {};
        if (title !== undefined && title.trim().length > 0) {
            updateData.title = title.trim();
        }
        if (duration !== undefined && duration > 0) {
            updateData.duration = duration.toString();
        }
        // Check if there's anything to update
        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({
                success: false,
                message: "No valid fields to update. Only title and duration can be updated.",
            });
        }
        // Update the lecture
        const updatedLecture = await database_setup_1.db
            .update(database_setup_1.lectures)
            .set(updateData)
            .where((0, drizzle_orm_1.eq)(database_setup_1.lectures.id, lectureId))
            .returning();
        logger_1.logger.info(`Lecture updated: ${lectureId} by teacher: ${userId}`);
        return res.status(200).json({
            success: true,
            message: "Lecture updated successfully",
            data: {
                lecture: {
                    id: updatedLecture[0].id,
                    title: updatedLecture[0].title,
                    duration: updatedLecture[0].duration,
                    status: updatedLecture[0].status,
                },
            },
        });
    }
    catch (error) {
        logger_1.logger.error("Error updating lecture:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message,
        });
    }
};
exports.updateLecture = updateLecture;
