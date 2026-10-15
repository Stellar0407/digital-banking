
const mongoose = require("mongoose");

const accountSchema = new mongoose.Schema(
  {
    id: {
      type: Number,
      required: true,
      unique: true
    },
    customerId: {
      type: Number,
      required: true,
      unique: true
    },
    accountNumber: {
      type: String,
      required: true,
      unique: true
    },
    accountName: {
      type: String,
      required: true
    },
    bankCode: {
      type: String,
      required: true
    },
    balance: {
      type: Number,
      required: true,
      default: 15000
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Account", accountSchema);
