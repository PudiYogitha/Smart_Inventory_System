const express = require("express");
const controller = require("../controllers/salesController");
const authMiddleware = require("../middleware/authMiddleware");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();
router.use(authMiddleware);
router.get("/", asyncHandler(controller.list));
router.post("/", asyncHandler(controller.create));
router.post("/sync", asyncHandler(controller.sync));

module.exports = router;
