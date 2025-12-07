"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchLectureAttendance = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const database_setup_1 = require("../../config/database_setup");
const logger_1 = require("../../utils/logger");
const fetchLectureAttendance = async (req, res) => {
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
                message: "Only teachers can fetch attendance records",
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
                message: "Lecture not found or you don't have permission to view it",
            });
        }
        // Fetch attendance records with student details
        const attendanceRecords = await database_setup_1.db
            .select({
            id: database_setup_1.attendance.id,
            studentId: database_setup_1.attendance.studentId,
            studentName: database_setup_1.users.name,
            studentEmail: database_setup_1.users.email,
            studentRollNo: database_setup_1.users.rollNo,
            joinTime: database_setup_1.attendance.joinTime,
            submitTime: database_setup_1.attendance.submitTime,
            status: database_setup_1.attendance.status,
            checkScore: database_setup_1.attendance.checkScore,
            method: database_setup_1.attendance.method,
            locationSnapshot: database_setup_1.attendance.locationSnapshot,
        })
            .from(database_setup_1.attendance)
            .leftJoin(database_setup_1.users, (0, drizzle_orm_1.eq)(database_setup_1.attendance.studentId, database_setup_1.users.id))
            .where((0, drizzle_orm_1.eq)(database_setup_1.attendance.lectureId, lectureId));
        logger_1.logger.info(`Fetched ${attendanceRecords.length} attendance records for lecture: ${lectureId}`);
        return res.status(200).json({
            success: true,
            data: {
                lectureId,
                attendanceCount: attendanceRecords.length,
                attendance: attendanceRecords,
            },
        });
    }
    catch (error) {
        logger_1.logger.error("Error fetching lecture attendance:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message,
        });
    }
};
exports.fetchLectureAttendance = fetchLectureAttendance;
