"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTeacherClasses = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const database_setup_1 = require("../../config/database_setup");
const logger_1 = require("../../utils/logger");
const getTeacherClasses = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }
        const teacherClasses = await database_setup_1.db
            .select()
            .from(database_setup_1.classes)
            .where((0, drizzle_orm_1.eq)(database_setup_1.classes.teacherId, userId))
            .orderBy(database_setup_1.classes.name);
        return res.status(200).json({
            success: true,
            data: teacherClasses,
        });
    }
    catch (error) {
        logger_1.logger.error("Get teacher classes error", error);
        return res
            .status(500)
            .json({ success: false, message: "Internal server error" });
    }
};
exports.getTeacherClasses = getTeacherClasses;
