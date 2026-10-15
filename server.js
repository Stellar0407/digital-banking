
require("dotenv").config();

const express = require("express");

const customerRoutes = require("./routes/customerRoutes");

const bankingRoutes = require("./routes/bankingRoutes");
const connectDatabase = require("./config/database");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use((req, res, next) => {
  console.log("Incoming request:", req.method, req.originalUrl);
  next();
});

app.use("/api/customers", customerRoutes);
console.log("Customer routes mounted");
app.use("/api/banking", bankingRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "Digital Banking API is running"
  });
});

async function startServer() {
  try {
    await connectDatabase();

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
}

startServer();