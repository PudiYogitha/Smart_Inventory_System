const bcrypt = require("bcryptjs");
const Business = require("../models/Business");
const User = require("../models/User");
const SystemSetting = require("../models/SystemSetting");
const { withTransaction } = require("../config/db");
const generateToken = require("../utils/generateToken");

exports.setupStatus = async (_req, res) => {
  res.json({ configured: Boolean(await User.exists({})) });
};

exports.setup = async (req, res) => {
  const error = validateRegistration(req.body);
  if (error) return res.status(400).json({ error });
  const user = await createBusinessUser(req.body, true);
  res.status(201).json(sessionDto(user));
};

exports.register = async (req, res) => {
  const error = validateRegistration(req.body);
  if (error) return res.status(400).json({ error });
  const user = await createBusinessUser(req.body, false);
  res.status(201).json(sessionDto(user));
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  if (typeof email !== "string" || typeof password !== "string") {
    return res.status(400).json({ error: "Email and password are required." });
  }
  const user = await User.findOne({ email: email.trim().toLowerCase() })
    .select("+passwordHash").populate("businessId");
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: "Email or password is incorrect." });
  }
  res.json(sessionDto(user));
};

exports.me = async (req, res) => {
  const user = await User.findById(req.user.id).populate("businessId");
  if (!user) return res.status(401).json({ error: "User account no longer exists." });
  res.json({ user: publicUser(user) });
};

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

function sessionDto(user) {
  return { token: generateToken(user), user: publicUser(user) };
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
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Enter a valid email address.";
  return null;
}
