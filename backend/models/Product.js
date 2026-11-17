const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: "Business", required: true },
  name: { type: String, required: true, trim: true, maxlength: 160 },
  sku: { type: String, required: true, trim: true, maxlength: 80 },
  barcode: { type: String, trim: true, maxlength: 100, default: null },
  category: { type: String, trim: true, maxlength: 80, default: "General" },
  price: { type: Number, required: true, min: 0, default: 0 },
  stock: { type: Number, required: true, min: 0, default: 0 },
  lowStockThreshold: { type: Number, required: true, min: 0, default: 5 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

productSchema.index({ businessId: 1, sku: 1 }, { unique: true });
productSchema.index({ businessId: 1, barcode: 1 }, {
  unique: true,
  partialFilterExpression: { barcode: { $type: "string" } }
});
productSchema.index({ businessId: 1, isActive: 1, name: 1 });
productSchema.index({ businessId: 1, isActive: 1, stock: 1, lowStockThreshold: 1 });

module.exports = mongoose.models.Product || mongoose.model("Product", productSchema);
