"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllLectures = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const database_setup_1 = require("../../config/database_setup");
const logger_1 = require("../../utils/logger");
const getAllLectures = async (req, res) => {
    try {
        const userId = req.user?.id;
        const userRole = req.user?.role;
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
                message: "Only teachers can fetch their lectures",
            });
        }
        // Fetch all lectures for this teacher with class information, sorted by most recent first
        const allLectures = await database_setup_1.db
            .select({
            id: database_setup_1.lectures.id,
            title: database_setup_1.lectures.title,
            className: database_setup_1.classes.name,
            duration: database_setup_1.lectures.duration,
            status: database_setup_1.lectures.status,
            createdAt: database_setup_1.lectures.createdAt,
            startedAt: database_setup_1.lectures.startedAt,
            endedAt: database_setup_1.lectures.endedAt,
            teacherLatitude: database_setup_1.lectures.teacherLatitude,
            teacherLongitude: database_setup_1.lectures.teacherLongitude,
        })
            .from(database_setup_1.lectures)
            .fullJoin(database_setup_1.classes, (0, drizzle_orm_1.eq)(database_setup_1.lectures.className, database_setup_1.classes.name))
            .where((0, drizzle_orm_1.eq)(database_setup_1.lectures.teacherId, userId))
            .orderBy((0, drizzle_orm_1.desc)(database_setup_1.lectures.createdAt));
        logger_1.logger.info(`Fetched ${allLectures.length} lectures for teacher: ${userId}`);
        return res.status(200).json({
            success: true,
            data: allLectures,
        });
    }
    catch (error) {
        logger_1.logger.error("Error fetching lectures:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message,
        });
    }
};
exports.getAllLectures = getAllLectures;
