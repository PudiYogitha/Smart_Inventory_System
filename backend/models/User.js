const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: "Business", required: true, index: true },
  name: { type: String, required: true, trim: true, minlength: 1, maxlength: 120 },
  email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ["admin", "staff"], required: true, default: "staff" }
}, { timestamps: true });

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ businessId: 1, createdAt: 1 });

module.exports = mongoose.models.User || mongoose.model("User", userSchema);
