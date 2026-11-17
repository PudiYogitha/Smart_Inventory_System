const express = require("express");
const controller = require("../controllers/reportController");
const authMiddleware = require("../middleware/authMiddleware");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();
router.use(authMiddleware);
router.get("/dashboard", asyncHandler(controller.dashboard));
router.get("/trends", asyncHandler(controller.trends));

module.exports = router;
