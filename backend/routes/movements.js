const express = require("express");
const StockMovement = require("../models/StockMovement");
const { authenticate } = require("../middleware/auth");
const { asyncHandler } = require("../utils/errors");

const router = express.Router();
router.use(authenticate);

router.get("/", asyncHandler(async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);
  const movements = await StockMovement.find({ businessId: req.user.businessId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("productId", "name sku")
    .populate("userId", "name")
    .lean();
  res.json({ movements: movements.map((movement) => ({
    id: String(movement._id),
    product_id: String(movement.productId?._id || movement.productId),
    product_name: movement.productId?.name || "Removed item",
    sku: movement.productId?.sku || "",
    user_id: movement.userId ? String(movement.userId._id) : null,
    staff_name: movement.userId?.name || "Former staff",
    change: movement.change,
    reason: movement.reason,
    created_at: movement.createdAt
  })) });
}));

module.exports = router;
