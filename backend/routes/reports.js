const express = require("express");
const mongoose = require("mongoose");
const Business = require("../models/Business");
const Product = require("../models/Product");
const Sale = require("../models/Sale");
const StockMovement = require("../models/StockMovement");
const { withTransaction } = require("../config/db");
const { authenticate, requireAdmin } = require("../middleware/auth");
const { asyncHandler } = require("../utils/errors");

const router = express.Router();
router.use(authenticate);

router.get("/dashboard", asyncHandler(async (req, res) => {
  const businessId = new mongoose.Types.ObjectId(req.user.businessId);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const monthStart = new Date(today);
  monthStart.setUTCDate(1);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [inventory, todaySales, monthlySales, lowStock, lowStockCount, bestsellers, demoProduct] = await Promise.all([
    Product.aggregate([
      { $match: { businessId, isActive: true } },
      { $group: {
        _id: null,
        items: { $sum: 1 },
        units: { $sum: "$stock" },
        value: { $sum: { $multiply: ["$stock", "$price"] } },
        outOfStock: { $sum: { $cond: [{ $eq: ["$stock", 0] }, 1, 0] } }
      } }
    ]),
    Sale.aggregate([
      { $match: { businessId, soldAt: { $gte: today } } },
      { $group: { _id: null, sales: { $sum: 1 }, revenue: { $sum: "$total" } } }
    ]),
    Sale.aggregate([
      { $match: { businessId, soldAt: { $gte: monthStart } } },
      { $group: { _id: null, sales: { $sum: 1 }, revenue: { $sum: "$total" } } }
    ]),
    Product.aggregate([
      { $match: { businessId, isActive: true, $expr: { $lte: ["$stock", "$lowStockThreshold"] } } },
      { $sort: { stock: 1, name: 1 } },
      { $limit: 10 }
    ]),
    Product.countDocuments({
      businessId,
      isActive: true,
      $expr: { $lte: ["$stock", "$lowStockThreshold"] }
    }),
    Sale.aggregate([
      { $match: { businessId, soldAt: { $gte: sevenDaysAgo } } },
      { $group: { _id: "$productId", units: { $sum: "$quantity" } } },
      { $sort: { units: -1 } },
      { $limit: 5 },
      { $lookup: { from: Product.collection.name, localField: "_id", foreignField: "_id", as: "product" } },
      { $unwind: "$product" },
      { $match: { "product.businessId": businessId, "product.isActive": true } },
      { $project: { _id: 0, id: "$product._id", name: "$product.name", units: 1 } }
    ]),
    Product.exists({ businessId, sku: /^DEMO-/ })
  ]);
  res.json({
    inventory: inventory[0] || { items: 0, units: 0, value: 0, outOfStock: 0 },
    today: todaySales[0] || { sales: 0, revenue: 0 },
    month: monthlySales[0] || { sales: 0, revenue: 0 },
    lowStock: lowStock.map(productDto),
    lowStockCount,
    bestsellers: bestsellers.map((item) => ({ ...item, id: String(item.id) })),
    demoData: Boolean(demoProduct)
  });
}));

router.post("/demo-data", requireAdmin, asyncHandler(async (req, res) => {
  const businessId = new mongoose.Types.ObjectId(req.user.businessId);
  const seeded = await withTransaction(async (session) => {
    const existingProduct = await Product.exists({ businessId }).session(session);
    const existingSale = await Sale.exists({ businessId }).session(session);
    if (existingProduct || existingSale) {
      const error = new Error("Sample data can only be loaded into an empty business.");
      error.status = 409;
      throw error;
    }

    const business = await Business.findOneAndUpdate(
      { _id: businessId, itemCount: 0 },
      { $inc: { itemCount: demoProducts.length } },
      { new: true, session }
    );
    if (!business) {
      const error = new Error("Sample data can only be loaded into an empty business.");
      error.status = 409;
      throw error;
    }

    const soldUnits = demoProducts.map((_, productIndex) =>
      demoSales.reduce((total, sale) => total + (sale.productIndex === productIndex ? sale.quantity : 0), 0)
    );
    const products = await Product.create(demoProducts.map((product, index) => ({
      businessId,
      name: product.name,
      sku: product.sku,
      category: product.category,
      price: product.price,
      stock: product.initialStock - soldUnits[index],
      lowStockThreshold: product.lowStockThreshold
    })), { session, ordered: true });
    const sales = await Sale.create(demoSales.map((sale, index) => ({
      businessId,
      productId: products[sale.productIndex]._id,
      userId: req.user.id,
      quantity: sale.quantity,
      unitPrice: products[sale.productIndex].price,
      total: products[sale.productIndex].price * sale.quantity,
      idempotencyKey: `demo-${businessId}-${index}`,
      soldAt: new Date(Date.now() - sale.daysAgo * 24 * 60 * 60 * 1000)
    })), { session, ordered: true });

    await StockMovement.create([
      ...products.map((product, index) => ({
        businessId,
        productId: product._id,
        userId: req.user.id,
        change: demoProducts[index].initialStock,
        reason: "Demo sample opening stock"
      })),
      ...demoSales.map((sale) => ({
        businessId,
        productId: products[sale.productIndex]._id,
        userId: req.user.id,
        change: -sale.quantity,
        reason: "Demo sample sale"
      }))
    ], { session, ordered: true });

    return { products: products.length, sales: sales.length };
  });
  res.status(201).json({ created: seeded });
}));

router.get("/trends", asyncHandler(async (req, res) => {
  const days = Math.min(Math.max(Number(req.query.days) || 30, 7), 90);
  const businessId = new mongoose.Types.ObjectId(req.user.businessId);
  const now = new Date();
  const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const [daily, popular, lowStock] = await Promise.all([
    Sale.aggregate([
      { $match: { businessId, soldAt: { $gte: since } } },
      { $group: {
        _id: { $dateTrunc: { date: "$soldAt", unit: "day", timezone: "UTC" } },
        units: { $sum: "$quantity" },
        revenue: { $sum: "$total" }
      } },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, day: "$_id", units: 1, revenue: 1 } }
    ]),
    Sale.aggregate([
      { $match: { businessId, soldAt: { $gte: thirtyDaysAgo } } },
      { $group: {
        _id: "$productId",
        units30d: { $sum: "$quantity" },
        units7d: { $sum: { $cond: [{ $gte: ["$soldAt", sevenDaysAgo] }, "$quantity", 0] } }
      } },
      { $sort: { units30d: -1 } },
      { $limit: 100 },
      { $lookup: { from: Product.collection.name, localField: "_id", foreignField: "_id", as: "product" } },
      { $unwind: "$product" },
      { $match: { "product.businessId": businessId, "product.isActive": true } },
      { $project: {
        _id: 0, id: "$product._id", name: "$product.name", sku: "$product.sku",
        stock: "$product.stock", lowStockThreshold: "$product.lowStockThreshold",
        units30d: 1, units7d: 1
      } }
    ]),
    Product.aggregate([
      { $match: { businessId, isActive: true, $expr: { $lte: ["$stock", "$lowStockThreshold"] } } },
      { $limit: 100 },
      { $project: {
        _id: 0, id: "$_id", name: 1, sku: 1, stock: 1,
        lowStockThreshold: 1, units30d: { $literal: 0 }, units7d: { $literal: 0 }
      } }
    ])
  ]);
  const candidates = new Map();
  for (const product of [...popular, ...lowStock]) {
    candidates.set(String(product.id), product);
  }
  const restock = [...candidates.values()].map((item) => {
    const dailyRate = Number(item.units30d) / 30;
    const daysLeft = dailyRate > 0 ? Math.floor(Number(item.stock) / dailyRate) : null;
    const suggested = Math.max(0, Math.ceil(dailyRate * 30 + Number(item.lowStockThreshold) - Number(item.stock)));
    return {
      id: String(item.id),
      name: item.name,
      sku: item.sku,
      stock: item.stock,
      low_stock_threshold: item.lowStockThreshold,
      units_30d: item.units30d,
      units_7d: item.units7d,
      dailyRate: Number(dailyRate.toFixed(2)),
      daysLeft,
      suggested
    };
  }).filter((item) => item.suggested > 0 || (item.daysLeft !== null && item.daysLeft <= 7));
  res.json({ daily, restock });
}));

const demoProducts = [
  { name: "Demo - Premium Desk Lamp", sku: "DEMO-LAMP-DESK", category: "Homeware", price: 1465, initialStock: 5, lowStockThreshold: 5 },
  { name: "Demo - Cotton Tote Bag", sku: "DEMO-TOTE-COTTON", category: "Accessories", price: 93, initialStock: 12, lowStockThreshold: 5 },
  { name: "Demo - Ceramic Coffee Mug", sku: "DEMO-MUG-CERAMIC", category: "Homeware", price: 100, initialStock: 20, lowStockThreshold: 5 },
  { name: "Demo - Stainless Water Bottle", sku: "DEMO-BOTTLE-STEEL", category: "Accessories", price: 100, initialStock: 19, lowStockThreshold: 5 },
  { name: "Demo - Organic Green Tea", sku: "DEMO-TEA-GREEN", category: "Beverages", price: 100, initialStock: 19, lowStockThreshold: 5 },
  { name: "Demo - Weekly Planner", sku: "DEMO-PLANNER-WEEKLY", category: "Stationery", price: 100, initialStock: 19, lowStockThreshold: 5 },
  { name: "Demo - Ceramic Planter", sku: "DEMO-PLANTER-CERAMIC", category: "Homeware", price: 100, initialStock: 19, lowStockThreshold: 5 },
  { name: "Demo - Reusable Lunch Box", sku: "DEMO-LUNCH-BOX", category: "Accessories", price: 100, initialStock: 18, lowStockThreshold: 5 }
];

const demoSales = [
  { productIndex: 1, quantity: 1, daysAgo: 3 },
  { productIndex: 1, quantity: 1, daysAgo: 8 }
];

function productDto(product) {
  return {
    id: String(product._id),
    name: product.name,
    sku: product.sku,
    barcode: product.barcode,
    category: product.category,
    price: product.price,
    stock: product.stock,
    low_stock_threshold: product.lowStockThreshold
  };
}

module.exports = router;
