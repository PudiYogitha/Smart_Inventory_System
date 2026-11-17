const mongoose = require("mongoose");
const Product = require("../models/Product");
const Sale = require("../models/Sale");
const StockMovement = require("../models/StockMovement");
const { withTransaction } = require("../config/db");

exports.list = async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);
  const sales = await Sale.find({ businessId: req.user.businessId })
    .sort({ soldAt: -1 }).limit(limit)
    .populate("productId", "name sku").populate("userId", "name").lean();
  res.json({ sales: sales.map(saleDto) });
};

exports.create = async (req, res) => {
  const productId = String(req.body.productId || "");
  const quantity = Number(req.body.quantity);
  const key = typeof req.body.idempotencyKey === "string" ? req.body.idempotencyKey : "";
  if (!mongoose.isValidObjectId(productId) || !Number.isInteger(quantity) || quantity < 1 || quantity > 100000) {
    return res.status(400).json({ error: "Select an item and enter a valid quantity." });
  }
  if (!validKey(key)) return res.status(400).json({ error: "A valid sale reference is required." });
  const oldSale = await Sale.findOne({ businessId: req.user.businessId, idempotencyKey: key }).lean();
  if (oldSale) return res.json({ sale: saleDto(oldSale), replayed: true });
  try {
    const sale = await processSale(req.user, productId, quantity, key, "Sale");
    if (!sale) return res.status(409).json({ error: "Item not found or there is not enough stock to complete this sale." });
    res.status(201).json({ sale: saleDto(sale), replayed: false });
  } catch (error) {
    if (error.code !== 11000) throw error;
    const duplicate = await Sale.findOne({ businessId: req.user.businessId, idempotencyKey: key }).lean();
    if (!duplicate) throw error;
    res.json({ sale: saleDto(duplicate), replayed: true });
  }
};

exports.sync = async (req, res) => {
  if (!Array.isArray(req.body.sales) || req.body.sales.length > 100) {
    return res.status(400).json({ error: "Sync accepts up to 100 queued sales at a time." });
  }
  const results = [];
  for (const queued of req.body.sales) {
    const key = typeof queued.idempotencyKey === "string" ? queued.idempotencyKey : "";
    if (!validKey(key)) {
      results.push({ idempotencyKey: key, status: "failed", error: "Invalid sale reference." });
      continue;
    }
    const existing = await Sale.findOne({ businessId: req.user.businessId, idempotencyKey: key }).lean();
    if (existing) {
      results.push({ idempotencyKey: key, status: "synced", sale: saleDto(existing) });
      continue;
    }
    const productKey = String(queued.productId || "");
    const identifiers = [{ sku: productKey }, { barcode: productKey }];
    if (mongoose.isValidObjectId(productKey)) identifiers.push({ _id: productKey });
    const product = await Product.findOne({
      businessId: req.user.businessId, isActive: true, $or: identifiers
    }).select("_id").lean();
    if (!product) {
      results.push({ idempotencyKey: key, status: "failed", error: "Item no longer exists." });
      continue;
    }
    try {
      const sale = await processSale(req.user, product._id, Number(queued.quantity), key, "Offline sale");
      results.push(sale
        ? { idempotencyKey: key, status: "synced", sale: saleDto(sale) }
        : { idempotencyKey: key, status: "failed", error: "Not enough stock to complete this sale." });
    } catch (error) {
      if (error.code !== 11000) throw error;
      const duplicate = await Sale.findOne({ businessId: req.user.businessId, idempotencyKey: key }).lean();
      if (!duplicate) throw error;
      results.push({ idempotencyKey: key, status: "synced", sale: saleDto(duplicate) });
    }
  }
  res.json({ results });
};

async function processSale(user, productId, quantity, key, reason) {
  if (!mongoose.isValidObjectId(String(productId)) ||
      !Number.isInteger(quantity) || quantity < 1 || quantity > 100000) return null;
  return withTransaction(async (session) => {
    const product = await Product.findOneAndUpdate({
      _id: productId, businessId: user.businessId, isActive: true, stock: { $gte: quantity }
    }, { $inc: { stock: -quantity } }, { new: true, session });
    if (!product) return null;
    const [sale] = await Sale.create([{
      businessId: user.businessId, productId: product._id, userId: user.id,
      quantity, unitPrice: product.price, total: product.price * quantity, idempotencyKey: key
    }], { session });
    await StockMovement.create([{
      businessId: user.businessId, productId: product._id,
      userId: user.id, change: -quantity, reason
    }], { session });
    return sale.toObject();
  });
}

function validKey(key) {
  return /^[\w-]{8,100}$/.test(key);
}

function saleDto(sale) {
  const product = sale.productId && typeof sale.productId === "object" ? sale.productId : null;
  const user = sale.userId && typeof sale.userId === "object" ? sale.userId : null;
  return {
    id: String(sale._id), product_id: String(product?._id || sale.productId),
    product_name: product?.name, sku: product?.sku, staff_name: user?.name,
    quantity: sale.quantity, unit_price: sale.unitPrice, total: sale.total, sold_at: sale.soldAt
  };
}
