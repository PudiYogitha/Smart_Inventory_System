const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { authenticate, requireAdmin } = require("../middleware/auth");
const { asyncHandler } = require("../utils/errors");

const router = express.Router();
router.use(authenticate, requireAdmin);

router.get("/", asyncHandler(async (req, res) => {
  const staff = await User.find({ businessId: req.user.businessId })
    .sort({ createdAt: 1 })
    .select("name email role createdAt")
    .lean();
  res.json({ staff: staff.map(staffDto) });
}));

router.post("/", asyncHandler(async (req, res) => {
  const { name, email, password, role = "staff" } = req.body;
  if (![name, email, password].every((value) => typeof value === "string" && value.trim())) {
    return res.status(400).json({ error: "Name, email, and password are required." });
  }
  if (name.trim().length > 120 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Enter a valid name and email address." });
  }
  if (password.length < 10) return res.status(400).json({ error: "Use a password with at least 10 characters." });
  if (!["staff", "admin"].includes(role)) return res.status(400).json({ error: "Role must be staff or admin." });
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({
    businessId: req.user.businessId,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    passwordHash,
    role
  });
  res.status(201).json({ staff: staffDto(user) });
}));

router.delete("/:id", asyncHandler(async (req, res) => {
  if (String(req.user.id) === req.params.id) {
    return res.status(400).json({ error: "You cannot remove your own account." });
  }
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: "Staff member not found." });
  const removed = await User.findOneAndDelete({ businessId: req.user.businessId, _id: req.params.id });
  if (!removed) return res.status(404).json({ error: "Staff member not found." });
  res.status(204).end();
}));

function staffDto(user) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    created_at: user.createdAt
  };
}

module.exports = router;
