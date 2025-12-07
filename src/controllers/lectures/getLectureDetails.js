"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLectureDetails = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const database_setup_1 = require("../../config/database_setup");
const logger_1 = require("../../utils/logger");
const getLectureDetails = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }
        const { lectureId } = req.params;
        // Get lecture details
        const lecture = await database_setup_1.db.query.lectures.findFirst({
            where: (0, drizzle_orm_1.eq)(database_setup_1.lectures.id, lectureId),
        });
        if (!lecture) {
            return res
                .status(404)
                .json({ success: false, message: "Lecture not found" });
        }
        // Count students who joined
        const studentCount = await database_setup_1.db
            .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
            .from(database_setup_1.attendance)
            .where((0, drizzle_orm_1.eq)(database_setup_1.attendance.lectureId, lectureId));
        return res.status(200).json({
            success: true,
            data: {
                lecture,
                studentCount: studentCount[0]?.count || 0,
            },
        });
    }
    catch (error) {
        logger_1.logger.error("Get lecture details error", error);
        return res
            .status(500)
            .json({ success: false, message: "Internal server error" });
    }
};
exports.getLectureDetails = getLectureDetails;
