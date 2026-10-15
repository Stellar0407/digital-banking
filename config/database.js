
const dns = require("dns");
const mongoose = require("mongoose");

// Use Google's public DNS for MongoDB SRV lookups.
dns.setServers(["8.8.8.8", "8.8.4.4"]);

async function connectDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
}

module.exports = connectDatabase;
