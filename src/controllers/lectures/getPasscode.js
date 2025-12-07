"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPasscode = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const database_setup_1 = require("../../config/database_setup");
const logger_1 = require("../../utils/logger");
const passcode_1 = require("../../utils/passcode");
const getPasscode = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { lectureId } = req.params;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        if (!lectureId) {
            return res.status(400).json({
                success: false,
                message: "Lecture ID is required",
            });
        }
        // Get the lecture
        const lecture = await database_setup_1.db.query.lectures.findFirst({
            where: (0, drizzle_orm_1.eq)(database_setup_1.lectures.id, lectureId),
        });
        if (!lecture) {
            return res.status(404).json({
                success: false,
                message: "Lecture not found",
            });
        }
        // Verify the user is the teacher
        if (lecture.teacherId !== userId) {
            return res.status(403).json({
                success: false,
                message: "Only the teacher can access the passcode",
            });
        }
        // Check if passcode needs refresh (only for ended lectures)
        let passcode = lecture.passcode;
        let passcodeUpdatedAt = lecture.passcodeUpdatedAt;
        // For ended lectures, only refresh if passcode doesn't exist yet
        // For active lectures (shouldn't happen with new flow, but handle it), don't allow access
        if (lecture.status === "active") {
            return res.status(400).json({
                success: false,
                message: "Passcode is only available after lecture ends",
            });
        }
        if ((0, passcode_1.needsPasscodeRefresh)(passcodeUpdatedAt) && lecture.status === "ended") {
            // Generate new passcode
            passcode = (0, passcode_1.generatePasscode)();
            passcodeUpdatedAt = new Date();
            // Update in database
            await database_setup_1.db
                .update(database_setup_1.lectures)
                .set({
                passcode,
                passcodeUpdatedAt,
            })
                .where((0, drizzle_orm_1.eq)(database_setup_1.lectures.id, lectureId));
            logger_1.logger.info(`Refreshed passcode for lecture ${lectureId}: ${passcode}`);
            // Emit socket event to notify all connected clients about passcode refresh
            const io = req.app.get("io");
            if (io) {
                io.to(`lecture-${lectureId}`).emit("passcodeRefresh", {
                    lectureId,
                    passcode,
                    updatedAt: passcodeUpdatedAt.toISOString(),
                });
                logger_1.logger.info(`Socket event emitted: passcodeRefresh for lecture-${lectureId}`);
            }
        }
        return res.status(200).json({
            success: true,
            data: {
                passcode,
                updatedAt: passcodeUpdatedAt,
            },
        });
    }
    catch (error) {
        logger_1.logger.error("Get passcode error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message,
        });
    }
};
exports.getPasscode = getPasscode;
