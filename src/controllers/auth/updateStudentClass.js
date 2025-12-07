"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateStudentClass = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const database_setup_1 = require("../../config/database_setup");
const logger_1 = require("../../utils/logger");
const updateStudentClass = async (req, res) => {
    try {
        const userId = req.user?.id;
        const userRole = req.user?.role;
        const { className } = req.body;
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
                message: "Only students can update their class",
            });
        }
        // Validate input
        if (!className ||
            typeof className !== "string" ||
            className.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: "Valid class name is required",
            });
        }
        // Find or create the class
        let classRecord = await database_setup_1.db
            .select()
            .from(database_setup_1.classes)
            .where((0, drizzle_orm_1.eq)(database_setup_1.classes.name, className.trim()))
            .limit(1);
        let exisitingClassName;
        if (classRecord.length > 0) {
            exisitingClassName = classRecord[0].name;
            logger_1.logger.info(`Found existing class: ${exisitingClassName} for student: ${userId}`);
        }
        else {
            // Create new class with no teacher (student-created class)
            const newClass = await database_setup_1.db
                .insert(database_setup_1.classes)
                .values({
                name: className.trim(),
                teacherId: null, // Student-created classes have no teacher
            })
                .returning();
            let newClassName = newClass[0].name;
            logger_1.logger.info(`Created new class: ${newClassName} for student: ${userId}`);
        }
        // Update the student's class
        const updatedUser = await database_setup_1.db
            .update(database_setup_1.users)
            .set({
            className: className.trim(),
        })
            .where((0, drizzle_orm_1.eq)(database_setup_1.users.id, userId))
            .returning();
        logger_1.logger.info(`Updated student ${userId} class to: ${className.trim()}`);
        return res.status(200).json({
            success: true,
            message: "Class updated successfully",
            data: {
                user: {
                    id: updatedUser[0].id,
                    email: updatedUser[0].email,
                    name: updatedUser[0].name,
                    role: updatedUser[0].role,
                    className: className.trim(),
                },
            },
        });
    }
    catch (error) {
        logger_1.logger.error("Error updating student class:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message,
        });
    }
};
exports.updateStudentClass = updateStudentClass;
