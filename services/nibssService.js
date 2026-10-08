const nibss = require("../config/nibss");
const getNibssToken = require("./nibssAuth");

async function nibssRequest(method, url, data = null) {
  const token = await getNibssToken();

  const response = await nibss({
  method,
  url,
  ...(data ? { data } : {}),
  headers: {
    Authorization: `Bearer ${token}`
  }
});

  return response.data;
}

module.exports = {
  nibssRequest
};