const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

exports.list = async (req, res) => {
  const staff = await User.find({ businessId: req.user.businessId })
    .sort({ createdAt: 1 }).select("name email role createdAt").lean();
  res.json({ staff: staff.map(userDto) });
};

exports.create = async (req, res) => {
  const { name, email, password, role = "staff" } = req.body;
  if (![name, email, password].every((value) => typeof value === "string" && value.trim())) {
    return res.status(400).json({ error: "Name, email, and password are required." });
  }
  if (name.trim().length > 120 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Enter a valid name and email address." });
  }
  if (password.length < 10) return res.status(400).json({ error: "Use a password with at least 10 characters." });
  if (!["staff", "admin"].includes(role)) return res.status(400).json({ error: "Role must be staff or admin." });
  const user = await User.create({
    businessId: req.user.businessId, name: name.trim(), email: email.trim().toLowerCase(),
    passwordHash: await bcrypt.hash(password, 12), role
  });
  res.status(201).json({ staff: userDto(user) });
};

exports.remove = async (req, res) => {
  if (String(req.user.id) === req.params.id) return res.status(400).json({ error: "You cannot remove your own account." });
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: "Staff member not found." });
  const removed = await User.findOneAndDelete({ _id: req.params.id, businessId: req.user.businessId });
  if (!removed) return res.status(404).json({ error: "Staff member not found." });
  res.status(204).end();
};

function userDto(user) {
  return { id: String(user._id), name: user.name, email: user.email, role: user.role, created_at: user.createdAt };
}
