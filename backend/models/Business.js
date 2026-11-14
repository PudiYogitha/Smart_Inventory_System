const mongoose = require("mongoose");

const businessSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 1, maxlength: 120 },
  itemCount: { type: Number, default: 0, min: 0, max: 100000 }
}, { timestamps: true });

module.exports = mongoose.models.Business || mongoose.model("Business", businessSchema);
