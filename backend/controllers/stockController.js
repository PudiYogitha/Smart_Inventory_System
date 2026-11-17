const mongoose = require("mongoose");
const Product = require("../models/Product");
const StockMovement = require("../models/StockMovement");
const { withTransaction } = require("../config/db");

exports.adjust = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: "Inventory item not found." });
  const quantity = Number(req.body.quantity);
  const reason = typeof req.body.reason === "string" ? req.body.reason.trim().slice(0, 200) : "";
  if (!Number.isInteger(quantity) || quantity === 0 || !reason) {
    return res.status(400).json({ error: "Enter a non-zero whole-number adjustment and a reason." });
  }
  const product = await withTransaction(async (session) => {
    const filter = { _id: req.params.id, businessId: req.user.businessId, isActive: true };
    if (quantity < 0) filter.stock = { $gte: Math.abs(quantity) };
    const updated = await Product.findOneAndUpdate(
      filter, { $inc: { stock: quantity } }, { new: true, runValidators: true, session }
    );
    if (!updated) return null;
    await StockMovement.create([{
      businessId: req.user.businessId, productId: updated._id, userId: req.user.id,
      change: quantity, reason
    }], { session });
    return updated;
  });
  if (!product) return res.status(404).json({ error: "Item not found, or adjustment would make stock negative." });
  res.json({ product: {
    id: String(product._id), stock: product.stock,
    name: product.name, sku: product.sku
  } });
};

exports.movements = async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);
  const movements = await StockMovement.find({ businessId: req.user.businessId })
    .sort({ createdAt: -1 }).limit(limit)
    .populate("productId", "name sku").populate("userId", "name").lean();
  res.json({ movements: movements.map((movement) => ({
    id: String(movement._id),
    product_id: String(movement.productId?._id || movement.productId),
    product_name: movement.productId?.name || "Removed item",
    sku: movement.productId?.sku || "",
    user_id: movement.userId ? String(movement.userId._id) : null,
    staff_name: movement.userId?.name || "Former staff",
    change: movement.change, reason: movement.reason, created_at: movement.createdAt
  })) });
};
