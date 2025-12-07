import express from "express";
import { joinLecture } from "../controllers/attendance/joinLecture";
import { pingLecture } from "../controllers/attendance/pingLecture";
import { submitAttendance } from "../controllers/attendance/submitAttendance";
import { authenticate } from "../middleware/auth";

const router = express.Router();

router.post("/join", authenticate, joinLecture);
router.post("/submit", authenticate, submitAttendance);
router.post("/ping", authenticate, pingLecture);

export default router;
