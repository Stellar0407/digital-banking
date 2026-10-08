const fs = require("fs");
const path = require("path");

const dataFile = path.join(__dirname, "../storage/data.json");

const data = JSON.parse(fs.readFileSync(dataFile, "utf-8"));

const customers = data.customers;
const accounts = data.accounts;
const transactions = data.transactions;

function saveData() {
  fs.writeFileSync(
    dataFile,
    JSON.stringify(
      {
        customers,
        accounts,
        transactions
      },
      null,
      2
    )
  );
}

module.exports = {
  customers,
  accounts,
  transactions,
  saveData
};