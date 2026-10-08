require("dotenv").config();

const express = require("express");

const customerRoutes = require("./routes/customerRoutes");
const getNibssToken = require("./services/nibssAuth");
const bankingRoutes = require("./routes/bankingRoutes");

console.log("Nibss Base URL:", process.env.NIBSS_BASE_URL);

const app = express();

app.use(express.json());
app.use("/api/customers", customerRoutes);
app.use("/api/banking", bankingRoutes);

const PORT = 3000;

app.get("/", (req, res) => {
  res.json({
    message: "Digital Banking API is running"
  });
});

app.get("/test-nibss", async (req, res) => {
  try {
    const token = await getNibssToken();

    res.json({
      message: "Nibss authentication successful",
      authenticated: true
    });
  } catch (error) {
    console.error("Nibss authentication error:", error.response?.data || error.message);

    res.status(500).json({
      message: "Nibss authentication failed"
    });
  }
});

app.get("/test-nibss", async (req, res) => {
  try {
    const token = await getNibssToken();

    res.json({
      message: "Nibss authentication successful",
      authenticated: true
    });
  } catch (error) {
    console.error("Nibss authentication error:", error.response?.data || error.message);

    res.status(500).json({
      message: "Nibss authentication failed"
    });
  }
});
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});