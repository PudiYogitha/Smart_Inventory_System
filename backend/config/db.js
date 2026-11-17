const mongoose = require("mongoose");

async function connectDB() {
  await mongoose.connect(process.env.MONGODB_URI, {
    maxPoolSize: Number(process.env.DB_POOL_SIZE || 20),
    serverSelectionTimeoutMS: 30000
  });
  await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
  const Business = mongoose.model("Business");
  const Product = mongoose.model("Product");
  const businesses = await Business.find({ itemCount: { $exists: false } }).select("_id").lean();
  for (const business of businesses) {
    const itemCount = await Product.countDocuments({ businessId: business._id, isActive: { $ne: false } });
    await Business.updateOne(
      { _id: business._id, itemCount: { $exists: false } },
      { $set: { itemCount } }
    );
  }
  console.log("Connected to MongoDB.");
}

async function withTransaction(operation) {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await operation(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
}

module.exports = { mongoose, connectDB, withTransaction };
