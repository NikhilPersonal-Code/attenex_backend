"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const addManualAttendance_1 = require("../controllers/lectures/addManualAttendance");
const createLecture_1 = require("../controllers/lectures/createLecture");
const deleteLecture_1 = require("../controllers/lectures/deleteLecture");
const endLecture_1 = require("../controllers/lectures/endLecture");
const fetchLectureAttendance_1 = require("../controllers/lectures/fetchLectureAttendance");
const getActiveLectures_1 = require("../controllers/lectures/getActiveLectures");
const getAllClasses_1 = require("../controllers/lectures/getAllClasses");
const getAllLectures_1 = require("../controllers/lectures/getAllLectures");
const getLectureDetails_1 = require("../controllers/lectures/getLectureDetails");
const getPasscode_1 = require("../controllers/lectures/getPasscode");
const getStudentLectures_1 = require("../controllers/lectures/getStudentLectures");
const getTeacherClasses_1 = require("../controllers/lectures/getTeacherClasses");
const updateLecture_1 = require("../controllers/lectures/updateLecture");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Lecture Management
router.post("/create", auth_1.authenticate, createLecture_1.createLecture);
router.get("/all", auth_1.authenticate, getAllLectures_1.getAllLectures);
router.get("/active", auth_1.authenticate, getActiveLectures_1.getActiveLectures);
router.get("/student/lectures", auth_1.authenticate, getStudentLectures_1.getStudentLectures);
router.get("/classes/all", auth_1.authenticate, getAllClasses_1.getAllClasses);
router.get("/classes", auth_1.authenticate, getTeacherClasses_1.getTeacherClasses);
router.get("/:lectureId/details", auth_1.authenticate, getLectureDetails_1.getLectureDetails);
router.get("/:lectureId/passcode", auth_1.authenticate, getPasscode_1.getPasscode);
router.put("/:lectureId/end", auth_1.authenticate, endLecture_1.endLecture);
router.put("/:lectureId/update", auth_1.authenticate, updateLecture_1.updateLecture);
router.delete("/:lectureId", auth_1.authenticate, deleteLecture_1.deleteLecture);
// Attendance Management
router.get("/:lectureId/attendance", auth_1.authenticate, fetchLectureAttendance_1.fetchLectureAttendance);
router.post("/:lectureId/attendance/manual", auth_1.authenticate, addManualAttendance_1.addManualAttendance);
exports.default = router;
