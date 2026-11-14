require("dotenv").config();
const path = require("node:path");
const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { connectDatabase, mongoose } = require("./config/db");
const { asyncHandler } = require("./utils/errors");

if (!process.env.MONGODB_URI || !process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error("MONGODB_URI and a JWT_SECRET of at least 32 characters must be configured.");
  process.exit(1);
}

const app = express();
app.disable("x-powered-by");
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      workerSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'none'"]
    }
  }
}));
app.use(express.json({ limit: "256kb" }));
app.use("/api/auth", rateLimit({ windowMs: 15 * 60 * 1000, limit: 100 }));
app.use("/api/auth", require("./routes/auth"));
app.use("/api/products", require("./routes/products"));
app.use("/api/sales", require("./routes/sales"));
app.use("/api/stock/movements", require("./routes/movements"));
app.use("/api/reports", require("./routes/reports"));
app.use("/api/staff", require("./routes/staff"));

app.get("/api/health", asyncHandler(async (_req, res) => {
  await mongoose.connection.db.admin().ping();
  res.json({ status: "ok" });
}));

const frontendPath = path.join(__dirname, "..", "frontend", "dist");
app.use(express.static(frontendPath));
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  res.sendFile(path.join(frontendPath, "index.html"), (error) => {
    if (error) next(error);
  });
});
app.use((req, res) => res.status(404).json({ error: "Not found." }));
app.use((error, _req, res, _next) => {
  if (error.status) return res.status(error.status).json({ error: error.message });
  if (error.code === 11000) return res.status(409).json({ error: "That email, SKU, or barcode is already in use." });
  if (error.name === "ValidationError" || error.name === "CastError") {
    return res.status(400).json({ error: "The submitted data is invalid." });
  }
  console.error(error);
  res.status(500).json({ error: "An unexpected server error occurred." });
});

const port = Number(process.env.PORT || 3000);
connectDatabase().then(() => {
  app.listen(port, () => console.log(`Smart Inventory System is listening on http://localhost:${port}`));
}).catch((error) => {
  console.error("Could not connect to MongoDB:", error);
  process.exit(1);
});
