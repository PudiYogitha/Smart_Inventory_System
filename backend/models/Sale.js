const mongoose = require("mongoose");

const saleSchema = new mongoose.Schema({
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: "Business", required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  total: { type: Number, required: true, min: 0 },
  idempotencyKey: { type: String, required: true, maxlength: 100 },
  soldAt: { type: Date, default: Date.now }
}, { versionKey: false });

saleSchema.index({ businessId: 1, idempotencyKey: 1 }, { unique: true });
saleSchema.index({ businessId: 1, soldAt: -1 });
saleSchema.index({ businessId: 1, productId: 1, soldAt: -1 });

module.exports = mongoose.models.Sale || mongoose.model("Sale", saleSchema);
