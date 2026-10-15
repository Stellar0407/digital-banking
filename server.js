
require("dotenv").config();

const express = require("express");

const customerRoutes = require("./routes/customerRoutes");
const getNibssToken = require("./services/nibssAuth");
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
app.get("/test-nibss-accounts", async (req, res) => {
  try {
    const { nibssRequest } = require("./services/nibssService");

    const result = await nibssRequest("GET", "/api/accounts");

    res.json(result);
  } catch (error) {
    console.error(
      "NIBSS accounts test failed:",
      error.response?.data || error.message
    );

    res.status(500).json({
      message: "Could not retrieve NIBSS accounts"
    });
  }
});

app.get("/", (req, res) => {
  res.json({
    message: "Digital Banking API is running"
  });
});

app.get("/test-nibss", async (req, res) => {
  try {
    await getNibssToken();

    res.json({
      message: "NIBSS authentication successful",
      authenticated: true
    });
  } catch (error) {
    console.error(
      "NIBSS authentication error:",
      error.response?.data || error.message
    );

    res.status(500).json({
      message: "NIBSS authentication failed"
    });
  }
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