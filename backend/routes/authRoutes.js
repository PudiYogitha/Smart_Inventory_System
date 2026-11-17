const express = require("express");
const controller = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();
router.get("/setup-status", asyncHandler(controller.setupStatus));
router.post("/setup", asyncHandler(controller.setup));
router.post("/register", asyncHandler(controller.register));
router.post("/login", asyncHandler(controller.login));
router.get("/me", authMiddleware, asyncHandler(controller.me));

module.exports = router;
