"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getActiveLectures = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const database_setup_1 = require("../../config/database_setup");
const logger_1 = require("../../utils/logger");
const getActiveLectures = async (req, res) => {
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
                message: "Only teachers can fetch their active lectures",
            });
        }
        // Fetch all active lectures for this teacher with class information
        const activeLectures = await database_setup_1.db
            .select({
            id: database_setup_1.lectures.id,
            title: database_setup_1.lectures.title,
            className: database_setup_1.classes.name,
            duration: database_setup_1.lectures.duration,
            status: database_setup_1.lectures.status,
            createdAt: database_setup_1.lectures.createdAt,
            startedAt: database_setup_1.lectures.startedAt,
            teacherLatitude: database_setup_1.lectures.teacherLatitude,
            teacherLongitude: database_setup_1.lectures.teacherLongitude,
        })
            .from(database_setup_1.lectures)
            .fullJoin(database_setup_1.classes, (0, drizzle_orm_1.eq)(database_setup_1.lectures.className, database_setup_1.classes.name))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(database_setup_1.lectures.teacherId, userId), (0, drizzle_orm_1.eq)(database_setup_1.lectures.status, "active")))
            .orderBy(database_setup_1.lectures.createdAt);
        logger_1.logger.info(`Fetched ${activeLectures.length} active lectures for teacher: ${userId}`);
        return res.status(200).json({
            success: true,
            data: activeLectures,
        });
    }
    catch (error) {
        logger_1.logger.error("Error fetching active lectures:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message,
        });
    }
};
exports.getActiveLectures = getActiveLectures;
