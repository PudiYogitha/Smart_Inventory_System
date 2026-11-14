const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Business = require("../models/Business");
const User = require("../models/User");
const SystemSetting = require("../models/SystemSetting");
const { withTransaction } = require("../config/db");
const { authenticate } = require("../middleware/auth");
const { asyncHandler } = require("../utils/errors");

const router = express.Router();

router.get("/setup-status", asyncHandler(async (_req, res) => {
  res.json({ configured: Boolean(await User.exists({})) });
}));

router.post("/setup", asyncHandler(async (req, res) => {
  const invalid = validateRegistration(req.body);
  if (invalid) return res.status(400).json({ error: invalid });
  const user = await createBusinessUser(req.body, true);
  res.status(201).json({ token: signToken(user), user: publicUser(user) });
}));

router.post("/register", asyncHandler(async (req, res) => {
  const invalid = validateRegistration(req.body);
  if (invalid) return res.status(400).json({ error: invalid });
  const user = await createBusinessUser(req.body, false);
  res.status(201).json({ token: signToken(user), user: publicUser(user) });
}));

router.post("/login", asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (typeof email !== "string" || typeof password !== "string") {
    return res.status(400).json({ error: "Email and password are required." });
  }
  const user = await User.findOne({ email: email.trim().toLowerCase() }).select("+passwordHash").populate("businessId");
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: "Email or password is incorrect." });
  }
  res.json({ token: signToken(user), user: publicUser(user) });
}));

router.get("/me", authenticate, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).populate("businessId");
  if (!user) return res.status(401).json({ error: "User account no longer exists." });
  res.json({ user: publicUser(user) });
}));

async function createBusinessUser(data, initialOnly) {
  const passwordHash = await bcrypt.hash(data.password, 12);
  return withTransaction(async (session) => {
    if (initialOnly) {
      if (await User.exists({}).session(session)) {
        const error = new Error("Initial setup has already been completed.");
        error.status = 409;
        throw error;
      }
      await SystemSetting.create([{ _id: "initial-setup" }], { session });
    }
    const [business] = await Business.create([{ name: data.businessName.trim() }], { session });
    const [user] = await User.create([{
      businessId: business._id,
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      passwordHash,
      role: "admin"
    }], { session });
    return { ...user.toObject(), businessId: business };
  });
}

function signToken(user) {
  const business = user.businessId;
  return jwt.sign(
    { id: String(user._id), businessId: String(business._id || business), role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "12h" }
  );
}

function publicUser(user) {
  const business = user.businessId;
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    businessId: String(business._id || business),
    businessName: business.name || ""
  };
}

function validateRegistration({ businessName, name, email, password } = {}) {
  if (![businessName, name, email, password].every((value) => typeof value === "string" && value.trim())) {
    return "Business name, your name, email, and password are required.";
  }
  if (businessName.trim().length > 120 || name.trim().length > 120) {
    return "Business name and your name must be 120 characters or fewer.";
  }
  if (password.length < 10) return "Use a password with at least 10 characters.";
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "Enter a valid email address.";
  }
  return null;
}

module.exports = router;
