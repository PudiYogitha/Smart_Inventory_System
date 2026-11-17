const express = require("express");
const controller = require("../controllers/productController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();
router.use(authMiddleware);
router.get("/", asyncHandler(controller.list));
router.post("/", asyncHandler(controller.create));
router.patch("/:id", roleMiddleware("admin"), asyncHandler(controller.update));
router.delete("/:id", roleMiddleware("admin"), asyncHandler(controller.remove));

module.exports = router;
