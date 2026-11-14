const mongoose = require("mongoose");

const stockMovementSchema = new mongoose.Schema({
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: "Business", required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  change: { type: Number, required: true, validate: (value) => Number.isInteger(value) && value !== 0 },
  reason: { type: String, required: true, trim: true, maxlength: 200 }
}, { timestamps: { createdAt: true, updatedAt: false }, versionKey: false });

stockMovementSchema.index({ businessId: 1, createdAt: -1 });
stockMovementSchema.index({ businessId: 1, productId: 1, createdAt: -1 });

module.exports = mongoose.models.StockMovement || mongoose.model("StockMovement", stockMovementSchema);
