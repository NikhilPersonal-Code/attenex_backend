"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addManualAttendance = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const database_setup_1 = require("../../config/database_setup");
const logger_1 = require("../../utils/logger");
const addManualAttendance = async (req, res) => {
    try {
        const userId = req.user?.id;
        const userRole = req.user?.role;
        const { lectureId } = req.params;
        const { studentEmail } = req.body;
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
                message: "Only teachers can manually add attendance",
            });
        }
        if (!lectureId || !studentEmail) {
            return res.status(400).json({
                success: false,
                message: "Lecture ID and student email are required",
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
                message: "Lecture not found or you don't have permission to modify it",
            });
        }
        // Find the student by email
        const student = await database_setup_1.db
            .select()
            .from(database_setup_1.users)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(database_setup_1.users.email, studentEmail), (0, drizzle_orm_1.eq)(database_setup_1.users.role, "student")))
            .limit(1);
        if (student.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Student not found with this email",
            });
        }
        const studentId = student[0].id;
        // Check if attendance already exists
        const existingAttendance = await database_setup_1.db
            .select()
            .from(database_setup_1.attendance)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(database_setup_1.attendance.lectureId, lectureId), (0, drizzle_orm_1.eq)(database_setup_1.attendance.studentId, studentId)))
            .limit(1);
        if (existingAttendance.length > 0) {
            // Update existing attendance to present
            const updatedAttendance = await database_setup_1.db
                .update(database_setup_1.attendance)
                .set({
                status: "present",
                method: "manual",
                submitTime: new Date(),
            })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(database_setup_1.attendance.lectureId, lectureId), (0, drizzle_orm_1.eq)(database_setup_1.attendance.studentId, studentId)))
                .returning();
            logger_1.logger.info(`Updated manual attendance for student: ${studentId} in lecture: ${lectureId}`);
            return res.status(200).json({
                success: true,
                message: "Attendance updated to present",
                data: {
                    attendance: {
                        id: updatedAttendance[0].id,
                        studentId: updatedAttendance[0].studentId,
                        studentName: student[0].name,
                        studentEmail: student[0].email,
                        status: updatedAttendance[0].status,
                        method: updatedAttendance[0].method,
                    },
                },
            });
        }
        // Create new manual attendance record
        const newAttendance = await database_setup_1.db
            .insert(database_setup_1.attendance)
            .values({
            lectureId,
            studentId,
            joinTime: new Date(),
            submitTime: new Date(),
            status: "present",
            method: "manual",
            checkScore: "100", // Full score for manual attendance
        })
            .returning();
        logger_1.logger.info(`Added manual attendance for student: ${studentId} in lecture: ${lectureId}`);
        return res.status(201).json({
            success: true,
            message: "Manual attendance added successfully",
            data: {
                attendance: {
                    id: newAttendance[0].id,
                    studentId: newAttendance[0].studentId,
                    studentName: student[0].name,
                    studentEmail: student[0].email,
                    status: newAttendance[0].status,
                    method: newAttendance[0].method,
                },
            },
        });
    }
    catch (error) {
        logger_1.logger.error("Error adding manual attendance:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message,
        });
    }
};
exports.addManualAttendance = addManualAttendance;
