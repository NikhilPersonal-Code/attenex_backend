"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLecture = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const database_setup_1 = require("../../config/database_setup");
const logger_1 = require("../../utils/logger");
const passcode_1 = require("../../utils/passcode");
const createLecture = async (req, res) => {
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
                message: "Only teachers can create lectures",
            });
        }
        const { className, lectureName, latitude, longitude, duration } = req.body;
        // Validate input
        if (!className || !lectureName || !latitude || !longitude || !duration) {
            return res.status(400).json({
                success: false,
                message: "Class name, lecture name, location, and duration are required",
            });
        }
        if (typeof className !== "string" || typeof lectureName !== "string") {
            return res.status(400).json({
                success: false,
                message: "Class name and lecture name must be strings",
            });
        }
        if (className.trim().length === 0 || lectureName.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: "Class name and lecture name cannot be empty",
            });
        }
        // Check if class already exists for this teacher
        const existingClass = await database_setup_1.db
            .select()
            .from(database_setup_1.classes)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(database_setup_1.classes.teacherId, userId), (0, drizzle_orm_1.eq)(database_setup_1.classes.name, className)))
            .limit(1);
        let classNameStr;
        if (existingClass.length > 0) {
            // Use existing class
            classNameStr = existingClass[0].name;
            logger_1.logger.info(`Using existing class: ${classNameStr} for teacher: ${userId}`);
        }
        else {
            // Create new class
            const newClass = await database_setup_1.db
                .insert(database_setup_1.classes)
                .values({
                name: className,
                teacherId: userId,
            })
                .returning();
            classNameStr = newClass[0].name;
            logger_1.logger.info(`Created new class: ${classNameStr} for teacher: ${userId}`);
        }
        // Create the lecture
        const initialPasscode = (0, passcode_1.generatePasscode)();
        const newLectures = await database_setup_1.db
            .insert(database_setup_1.lectures)
            .values({
            teacherId: userId,
            className: classNameStr,
            title: lectureName,
            teacherLatitude: latitude.toString(),
            teacherLongitude: longitude.toString(),
            duration: duration.toString(),
            status: "active",
            passcode: initialPasscode,
            passcodeUpdatedAt: new Date(),
        })
            .returning();
        const newLecture = newLectures[0];
        logger_1.logger.info(`Lecture created: ${newLecture.id} by teacher: ${userId}`);
        return res.status(201).json({
            success: true,
            message: "Lecture created successfully",
            data: {
                lecture: {
                    id: newLecture.id,
                    title: newLecture.title,
                    className: className,
                    duration: newLecture.duration,
                    status: newLecture.status,
                    createdAt: newLecture.createdAt,
                },
            },
        });
    }
    catch (error) {
        logger_1.logger.error("Error creating lecture:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message,
        });
    }
};
exports.createLecture = createLecture;
