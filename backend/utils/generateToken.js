const jwt = require("jsonwebtoken");

module.exports = function generateToken(user) {
  return jwt.sign({
    id: String(user._id),
    businessId: String(user.businessId._id || user.businessId),
    role: user.role
  }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "12h" });
};
