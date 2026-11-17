const mongoose = require("mongoose");

const systemSettingSchema = new mongoose.Schema({
  _id: String,
  createdAt: { type: Date, default: Date.now }
}, { versionKey: false });

module.exports = mongoose.models.SystemSetting || mongoose.model("SystemSetting", systemSettingSchema);
