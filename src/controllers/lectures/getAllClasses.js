"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllClasses = void 0;
const database_setup_1 = require("../../config/database_setup");
const getAllClasses = async (req, res) => {
    try {
        const allClasses = await database_setup_1.db.select().from(database_setup_1.classes);
        res.status(200).json({
            success: true,
            data: allClasses,
        });
    }
    catch (error) {
        console.error("Error fetching classes:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch classes",
        });
    }
};
exports.getAllClasses = getAllClasses;
