const mongoose = require("mongoose");

async function connectDatabase() {
  await mongoose.connect(process.env.MONGODB_URI, {
    maxPoolSize: Number(process.env.DB_POOL_SIZE || 20),
    serverSelectionTimeoutMS: 30000,
    autoIndex: true
  });
  await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
  console.log("Connected to MongoDB.");
}

async function withTransaction(callback) {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await callback(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
}

module.exports = { connectDatabase, withTransaction, mongoose };
