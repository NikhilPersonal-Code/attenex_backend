"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const joinLecture_1 = require("../controllers/attendance/joinLecture");
const pingLecture_1 = require("../controllers/attendance/pingLecture");
const submitAttendance_1 = require("../controllers/attendance/submitAttendance");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.post("/join", auth_1.authenticate, joinLecture_1.joinLecture);
router.post("/submit", auth_1.authenticate, submitAttendance_1.submitAttendance);
router.post("/ping", auth_1.authenticate, pingLecture_1.pingLecture);
exports.default = router;
