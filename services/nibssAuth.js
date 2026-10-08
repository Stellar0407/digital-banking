const nibss = require("../config/nibss");

async function getNibssToken() {
  const response = await nibss.post("/api/auth/token", {
    apiKey: process.env.NIBSS_API_KEY,
    apiSecret: process.env.NIBSS_API_SECRET
  });

  return response.data.token;
}

module.exports = getNibssToken;