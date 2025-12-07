"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStudentLectures = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const database_setup_1 = require("../../config/database_setup");
const logger_1 = require("../../utils/logger");
const getStudentLectures = async (req, res) => {
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
        // Verify user is a student
        if (userRole !== "student") {
            return res.status(403).json({
                success: false,
                message: "Only students can fetch their class lectures",
            });
        }
        // Get student's class name
        const student = await database_setup_1.db
            .select()
            .from(database_setup_1.users)
            .where((0, drizzle_orm_1.eq)(database_setup_1.users.id, userId))
            .limit(1);
        if (student.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Student not found",
            });
        }
        const studentClassName = student[0].className;
        if (!studentClassName) {
            return res.status(200).json({
                success: true,
                data: [],
                message: "Please set your class first to see available lectures",
            });
        }
        // Get the student's class name
        const studentClass = await database_setup_1.db
            .select()
            .from(database_setup_1.classes)
            .where((0, drizzle_orm_1.eq)(database_setup_1.classes.name, studentClassName))
            .limit(1);
        if (studentClass.length === 0) {
            return res.status(200).json({
                success: true,
                data: [],
                message: "Class not found. Please update your class.",
            });
        }
        // Fetch all active lectures for classes with matching name
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
            .leftJoin(database_setup_1.classes, (0, drizzle_orm_1.eq)(database_setup_1.lectures.className, database_setup_1.classes.name))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(database_setup_1.classes.name, studentClassName), (0, drizzle_orm_1.eq)(database_setup_1.lectures.status, "active")))
            .orderBy(database_setup_1.lectures.createdAt);
        logger_1.logger.info(`Fetched ${activeLectures.length} active lectures for student: ${userId} in class: ${studentClassName}`);
        return res.status(200).json({
            success: true,
            data: activeLectures,
        });
    }
    catch (error) {
        logger_1.logger.error("Error fetching student lectures:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message,
        });
    }
};
exports.getStudentLectures = getStudentLectures;
