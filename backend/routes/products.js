const express = require("express");
const mongoose = require("mongoose");
const Business = require("../models/Business");
const Product = require("../models/Product");
const StockMovement = require("../models/StockMovement");
const { withTransaction } = require("../config/db");
const { authenticate, requireAdmin } = require("../middleware/auth");
const { asyncHandler } = require("../utils/errors");

const router = express.Router();
router.use(authenticate);

router.get("/", asyncHandler(async (req, res) => {
  const search = typeof req.query.search === "string" ? req.query.search.trim().slice(0, 100) : "";
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
  const offset = Math.min(Math.max(Number(req.query.offset) || 0, 0), 100000);
  const filter = { businessId: req.user.businessId, isActive: true };
  if (search) {
    const matcher = new RegExp(escapeRegex(search), "i");
    filter.$or = [
      ...(mongoose.isValidObjectId(search) ? [{ _id: search }] : []),
      { name: matcher }, { sku: matcher }, { barcode: matcher }
    ];
  }
  const [products, total] = await Promise.all([
    Product.find(filter).sort({ name: 1, _id: 1 }).skip(offset).limit(limit).lean(),
    Product.countDocuments(filter)
  ]);
  res.json({ products: products.map(productDto), total, limit, offset });
}));

router.post("/", asyncHandler(async (req, res) => {
  const values = productValues(req.body);
  if (values.error) return res.status(400).json({ error: values.error });
  const product = await withTransaction(async (session) => {
    const business = await Business.findOneAndUpdate(
      { _id: req.user.businessId, itemCount: { $lt: 100000 } },
      { $inc: { itemCount: 1 } },
      { new: true, session }
    );
    if (!business) {
      const error = new Error("This business has reached the 100,000 item limit.");
      error.status = 409;
      throw error;
    }
    const [created] = await Product.create([{
      businessId: req.user.businessId,
      ...values.data
    }], { session });
    if (created.stock > 0) {
      await StockMovement.create([{
        businessId: req.user.businessId,
        productId: created._id,
        userId: req.user.id,
        change: created.stock,
        reason: "Initial stock"
      }], { session });
    }
    return created;
  });
  res.status(201).json({ product: productDto(product) });
}));

router.patch("/:id", requireAdmin, asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: "Inventory item not found." });
  const values = productValues(req.body, false);
  if (values.error) return res.status(400).json({ error: values.error });
  const product = await Product.findOneAndUpdate(
    { businessId: req.user.businessId, _id: req.params.id, isActive: true },
    { $set: values.data },
    { new: true, runValidators: true }
  ).lean();
  if (!product) return res.status(404).json({ error: "Inventory item not found." });
  res.json({ product: productDto(product) });
}));

router.delete("/:id", requireAdmin, asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: "Inventory item not found." });
  const removed = await withTransaction(async (session) => {
    const product = await Product.findOneAndUpdate(
      { businessId: req.user.businessId, _id: req.params.id, isActive: true },
      { $set: { isActive: false } },
      { new: true, session }
    );
    if (product) {
      await Business.updateOne({ _id: req.user.businessId }, { $inc: { itemCount: -1 } }, { session });
    }
    return product;
  });
  if (!removed) return res.status(404).json({ error: "Inventory item not found." });
  res.status(204).end();
}));

router.post("/:id/adjustments", asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: "Inventory item not found." });
  const quantity = Number(req.body.quantity);
  const reason = typeof req.body.reason === "string" ? req.body.reason.trim().slice(0, 200) : "";
  if (!Number.isInteger(quantity) || quantity === 0 || !reason) {
    return res.status(400).json({ error: "Enter a non-zero whole-number adjustment and a reason." });
  }
  const product = await withTransaction(async (session) => {
    const filter = { businessId: req.user.businessId, _id: req.params.id, isActive: true };
    if (quantity < 0) filter.stock = { $gte: -quantity };
    const updated = await Product.findOneAndUpdate(
      filter,
      { $inc: { stock: quantity } },
      { new: true, runValidators: true, session }
    );
    if (!updated) return null;
    await StockMovement.create([{
      businessId: req.user.businessId,
      productId: updated._id,
      userId: req.user.id,
      change: quantity,
      reason
    }], { session });
    return updated;
  });
  if (!product) return res.status(404).json({ error: "Item not found, or adjustment would make stock negative." });
  res.json({ product: productDto(product) });
}));

function productValues(body, includeStock = true) {
  const { name, sku, barcode, category = "General" } = body;
  const price = Number(body.price ?? 0);
  const threshold = Number(body.lowStockThreshold ?? body.low_stock_threshold ?? 5);
  const stock = includeStock ? Number(body.stock ?? 0) : undefined;
  if (![name, sku].every((value) => typeof value === "string" && value.trim())) {
    return { error: "Item name and SKU are required." };
  }
  if (name.length > 160 || sku.length > 80 || String(category).length > 80 ||
      (typeof barcode === "string" && barcode.length > 100)) {
    return { error: "Name, SKU, barcode, or category is too long." };
  }
  if (!Number.isFinite(price) || price < 0 || !Number.isInteger(threshold) || threshold < 0) {
    return { error: "Price and low-stock threshold must be valid non-negative numbers." };
  }
  if (includeStock && (!Number.isInteger(stock) || stock < 0)) {
    return { error: "Stock must be a non-negative whole number." };
  }
  return {
    data: {
      name: name.trim(),
      sku: sku.trim(),
      barcode: typeof barcode === "string" && barcode.trim() ? barcode.trim() : null,
      category: String(category).trim() || "General",
      price,
      ...(includeStock ? { stock } : {}),
      lowStockThreshold: threshold
    }
  };
}

function productDto(product) {
  return {
    id: String(product._id),
    name: product.name,
    sku: product.sku,
    barcode: product.barcode,
    category: product.category,
    price: product.price,
    stock: product.stock,
    low_stock_threshold: product.lowStockThreshold,
    created_at: product.createdAt,
    updated_at: product.updatedAt
  };
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = router;
