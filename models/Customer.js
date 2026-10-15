
const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema(
  {
    id: {
      type: Number,
      required: true,
      unique: true
    },
    firstName: {
      type: String,
      required: true
    },
    lastName: {
      type: String,
      required: true
    },
    phone: {
      type: String
    },
    kycType: {
      type: String,
      required: true,
      enum: ["bvn", "nin"]
    },
    kycId: {
      type: String,
      required: true
    },
    dob: {
      type: String
    },
    kycVerified: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

customerSchema.index(
  { kycType: 1, kycId: 1 },
  { unique: true }
);

module.exports = mongoose.model("Customer", customerSchema);
