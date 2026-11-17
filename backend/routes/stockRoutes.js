const express = require("express");
const controller = require("../controllers/stockController");
const authMiddleware = require("../middleware/authMiddleware");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();
router.use(authMiddleware);
router.get("/movements", asyncHandler(controller.movements));
router.post("/products/:id/adjustments", asyncHandler(controller.adjust));

module.exports = router;
