const mongoose = require("mongoose");
const Product = require("../models/Product");
const Sale = require("../models/Sale");

exports.dashboard = async (req, res) => {
  const businessId = new mongoose.Types.ObjectId(req.user.businessId);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const week = new Date(Date.now() - 7 * 86400000);
  const [inventory, todaySales, lowStock, bestsellers] = await Promise.all([
    Product.aggregate([
      { $match: { businessId, isActive: true } },
      { $group: { _id: null, items: { $sum: 1 }, units: { $sum: "$stock" }, value: { $sum: { $multiply: ["$stock", "$price"] } } } }
    ]),
    Sale.aggregate([
      { $match: { businessId, soldAt: { $gte: today } } },
      { $group: { _id: null, sales: { $sum: 1 }, revenue: { $sum: "$total" } } }
    ]),
    Product.aggregate([
      { $match: { businessId, isActive: true, $expr: { $lte: ["$stock", "$lowStockThreshold"] } } },
      { $sort: { stock: 1, name: 1 } }, { $limit: 10 }
    ]),
    Sale.aggregate([
      { $match: { businessId, soldAt: { $gte: week } } },
      { $group: { _id: "$productId", units: { $sum: "$quantity" } } },
      { $sort: { units: -1 } }, { $limit: 5 },
      { $lookup: { from: Product.collection.name, localField: "_id", foreignField: "_id", as: "product" } },
      { $unwind: "$product" },
      { $match: { "product.businessId": businessId, "product.isActive": true } },
      { $project: { _id: 0, id: "$product._id", name: "$product.name", units: 1 } }
    ])
  ]);
  res.json({
    inventory: inventory[0] || { items: 0, units: 0, value: 0 },
    today: todaySales[0] || { sales: 0, revenue: 0 },
    lowStock: lowStock.map((item) => productDto(item)),
    bestsellers: bestsellers.map((item) => ({ ...item, id: String(item.id) }))
  });
};

exports.trends = async (req, res) => {
  const days = Math.min(Math.max(Number(req.query.days) || 30, 7), 90);
  const businessId = new mongoose.Types.ObjectId(req.user.businessId);
  const now = new Date();
  const start = new Date(now.getTime() - days * 86400000);
  const month = new Date(now.getTime() - 30 * 86400000);
  const week = new Date(now.getTime() - 7 * 86400000);
  const [daily, popular, lowStock] = await Promise.all([
    Sale.aggregate([
      { $match: { businessId, soldAt: { $gte: start } } },
      { $group: {
        _id: { $dateTrunc: { date: "$soldAt", unit: "day", timezone: "UTC" } },
        units: { $sum: "$quantity" }, revenue: { $sum: "$total" }
      } },
      { $sort: { _id: 1 } }, { $project: { _id: 0, day: "$_id", units: 1, revenue: 1 } }
    ]),
    Sale.aggregate([
      { $match: { businessId, soldAt: { $gte: month } } },
      { $group: {
        _id: "$productId", units30d: { $sum: "$quantity" },
        units7d: { $sum: { $cond: [{ $gte: ["$soldAt", week] }, "$quantity", 0] } }
      } },
      { $sort: { units30d: -1 } }, { $limit: 100 },
      { $lookup: { from: Product.collection.name, localField: "_id", foreignField: "_id", as: "product" } },
      { $unwind: "$product" },
      { $match: { "product.businessId": businessId, "product.isActive": true } },
      { $project: {
        _id: 0, id: "$product._id", name: "$product.name", sku: "$product.sku",
        stock: "$product.stock", lowStockThreshold: "$product.lowStockThreshold", units30d: 1, units7d: 1
      } }
    ]),
    Product.aggregate([
      { $match: { businessId, isActive: true, $expr: { $lte: ["$stock", "$lowStockThreshold"] } } },
      { $limit: 100 },
      { $project: {
        _id: 0, id: "$_id", name: 1, sku: 1, stock: 1, lowStockThreshold: 1,
        units30d: { $literal: 0 }, units7d: { $literal: 0 }
      } }
    ])
  ]);
  const candidates = new Map([...lowStock, ...popular].map((item) => [String(item.id), item]));
  const restock = [...candidates.values()].map((item) => {
    const dailyRate = Number(item.units30d) / 30;
    const daysLeft = dailyRate > 0 ? Math.floor(item.stock / dailyRate) : null;
    return {
      id: String(item.id), name: item.name, sku: item.sku, stock: item.stock,
      low_stock_threshold: item.lowStockThreshold, dailyRate: Number(dailyRate.toFixed(2)),
      daysLeft, suggested: Math.max(0, Math.ceil(dailyRate * 30 + item.lowStockThreshold - item.stock))
    };
  }).filter((item) => item.suggested > 0 || (item.daysLeft !== null && item.daysLeft <= 7));
  res.json({ daily: daily.map(({ day, units, revenue }) => ({ day, units, revenue })), restock });
};

function productDto(product) {
  return {
    id: String(product._id), name: product.name, sku: product.sku, barcode: product.barcode,
    category: product.category, price: product.price, stock: product.stock,
    low_stock_threshold: product.lowStockThreshold
  };
}
