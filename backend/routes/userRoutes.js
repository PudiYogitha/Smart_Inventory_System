const express = require("express");
const controller = require("../controllers/userController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();
router.use(authMiddleware, roleMiddleware("admin"));
router.get("/", asyncHandler(controller.list));
router.post("/", asyncHandler(controller.create));
router.delete("/:id", asyncHandler(controller.remove));

module.exports = router;
