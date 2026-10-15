
const express = require("express");
const jwt = require("jsonwebtoken");
const { nibssRequest } = require("../services/nibssService");
const Customer = require("../models/Customer");
const Account = require("../models/Account");
const generateId = require("../services/generateId");

const router = express.Router();

// Register a customer using BVN
router.post("/bvn", async (req, res) => {
  try {
    const { bvn, firstName, lastName, dob, phone } = req.body;

    if (!bvn || !firstName || !lastName || !dob) {
      return res.status(400).json({
        message: "BVN, first name, last name, and date of birth are required"
      });
    }

    const result = await nibssRequest("POST", "/api/insertBvn", {
      bvn,
      firstName,
      lastName,
      dob,
      phone
    });

    const customer = await Customer.create({
      id: await generateId("customer"),
      firstName,
      lastName,
      phone,
      dob,
      kycType: "bvn",
      kycId: bvn,
      kycVerified: false
    });

    return res.status(201).json({
      message: "BVN onboarding successful",
      customer,
      nibssResponse: result
    });
  } catch (error) {
  console.error("BVN onboarding error:", {
    status: error.response?.status,
    data: error.response?.data,
    message: error.message
  });

  return res.status(500).json({
    message: "BVN onboarding failed"
  });
}
});

 // Validate BVN
router.post("/bvn/validate", async (req, res) => {
  console.log("UPDATED BVN VALIDATION ROUTE HIT");
    try {
    const { bvn } = req.body;

    if (!bvn) {
      return res.status(400).json({
        message: "BVN is required"
      });
    }

    // Validate the BVN with NIBSS first
    const result = await nibssRequest(
      "POST",
      "/api/validateBvn",
      { bvn }
    );

    if (result.success !== true) {
      return res.status(400).json({
        message: result.message || "BVN validation failed"
      });
    }

    const details = result.data;

    if (!details?.bvn || details.bvn !== bvn) {
      return res.status(502).json({
        message: "NIBSS returned invalid BVN details"
      });
    }

    // Check whether this customer is already saved locally
    let customer = await Customer.findOne({
      kycType: "bvn",
      kycId: bvn
    });

    if (customer) {
      customer.kycVerified = true;
      await customer.save();
    } else {
      // Save the verified sandbox customer in MongoDB
      customer = await Customer.create({
        id: await generateId("customer"),
        firstName: details.firstName,
        lastName: details.lastName,
        dob: details.dob,
        phone: details.phone,
        kycType: "bvn",
        kycId: bvn,
        kycVerified: true
      });
    }

    return res.json({
      message: "BVN validation successful",
      customer
    });
  } catch (error) {
    console.error(
      "BVN validation error:",
      error.response?.data || error.message
    );

    return res.status(500).json({
      message: "BVN validation failed"
    });
  }
});

// Register a customer using NIN
router.post("/nin", async (req, res) => {
  try {
    const { nin, firstName, lastName, dob } = req.body;

    if (!nin || !firstName || !lastName || !dob) {
      return res.status(400).json({
        message: "NIN, first name, last name, and date of birth are required"
      });
    }

    const result = await nibssRequest("POST", "/api/insertNin", {
      nin,
      firstName,
      lastName,
      dob
    });

    const existingCustomer = await Customer.findOne({
      kycType: "nin",
      kycId: nin
    });

    if (existingCustomer) {
      return res.status(409).json({
        message: "A customer with this NIN already exists"
      });
    }

    const customer = await Customer.create({
      id: await generateId("customer"),
      firstName,
      lastName,
      dob,
      kycType: "nin",
      kycId: nin,
      kycVerified: false
    });

    return res.status(201).json({
      message: "NIN onboarding successful",
      customer,
      nibssResponse: result
    });
  } catch (error) {
    console.error("NIN onboarding error:", error.response?.data || error.message);
    return res.status(500).json({ message: "NIN onboarding failed" });
  }
});

// Validate NIN
router.post("/nin/validate", async (req, res) => {
  try {
    const { nin } = req.body;

    if (!nin) {
      return res.status(400).json({
        message: "NIN is required"
      });
    }

    const customer = await Customer.findOne({
      kycType: "nin",
      kycId: nin
    });

    if (!customer) {
      return res.status(404).json({
        message: "Customer not found"
      });
    }

    const result = await nibssRequest(
      "POST",
      "/api/validateNin",
      { nin }
    );

    // Only mark the customer verified if NIBSS
    // explicitly confirms successful validation.
    const verificationSucceeded =
  result?.message === "NIN Verified!!" &&
  result?.response?.nin === nin;

    if (!verificationSucceeded) {
      customer.kycVerified = false;
      await customer.save();

      return res.status(400).json({
        message: "NIN verification was not successful"
      });
    }

    customer.kycVerified = true;
    await customer.save();

    return res.json({
      message: "NIN validation successful",
      customer,
      nibssResponse: result
    });
  } catch (error) {
    console.error(
      "NIN validation error:",
      error.response?.data || error.message
    );

    return res.status(500).json({
      message: "NIN validation failed"
    });
  }
});

// Create an account after successful KYC verification
router.post("/account", async (req, res) => {
  try {
    const { customerId, kycType, kycId, dob } = req.body;

    const customer = await Customer.findOne({
      id: Number(customerId),
      kycType: String(kycType || "").toLowerCase(),
      kycId
    });

    if (!customer) {
      return res.status(404).json({
        message: "Customer not found"
      });
    }

    if (!customer.kycVerified) {
      return res.status(400).json({
        message: "Customer KYC has not been verified"
      });
    }

    const existingAccount = await Account.findOne({
      customerId: customer.id
    });

    if (existingAccount) {
      return res.status(409).json({
        message: "Customer already has an account",
        account: existingAccount
      });
    }

    let result;

    try {
      result = await nibssRequest("POST", "/api/account/create", {
        kycType: customer.kycType.toUpperCase(),
        kycID: customer.kycId,
        dob: dob || customer.dob
      });
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || error.message;

      if (!errorMessage.toLowerCase().includes("already linked")) {
        throw error;
      }

      const accountsResult = await nibssRequest(
        "GET",
        "/api/accounts"
      );

      const accounts = accountsResult.accounts || [];

      result = {
        account: accounts.find(
          (item) =>
            item.kycType.toLowerCase() === customer.kycType &&
            item.kycID === customer.kycId
        )
      };

      if (!result.account) {
        return res.status(409).json({
          message:
            "NIBSS reports an existing account, but its details could not be retrieved."
        });
      }
    }

    if (!result.account?.accountNumber) {
      return res.status(502).json({
        message: "NIBSS did not return valid account details"
      });
    }

    const account = await Account.create({
      id: await generateId("account"),
      customerId: customer.id,
      accountNumber: result.account.accountNumber,
      accountName: result.account.accountName,
      bankCode: String(result.account.bankCode),
      balance: Number(result.account.balance)
    });

    return res.status(201).json({
      message: "Account linked successfully",
      account
    });

} catch (error) {
  const statusCode = error.response?.status;

  console.error("Account creation error:", {
    status: statusCode,
    data: error.response?.data,
    message: error.message
  });

  // Handle duplicate account records
  if (error.code === 11000) {
    return res.status(409).json({
      message: "Customer already has an account"
    });
  }

  // Handle errors returned by NIBSS
  if (statusCode) {
    return res.status(statusCode).json({
      message:
        error.response?.data?.message ||
        "Account creation request was rejected"
    });
  }

  // Handle unexpected server errors
  return res.status(500).json({
    message: "Account creation failed"
  });
}
});

//Customer login
router.post("/login", async (req, res) => {
  try {
    const { customerId, kycId } = req.body;

    const customer = await Customer.findOne({
      id: Number(customerId),
      kycId
    });

    if (!customer) {
      return res.status(401).json({
        message: "Invalid customer ID or KYC ID"
      });
    }

    if (!customer.kycVerified) {
      return res.status(403).json({
        message: "Customer KYC has not been verified"
      });
    }

    const token = jwt.sign(
      { customerId: customer.id },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    return res.json({
      message: "Login successful",
      token
    });
  } catch (error) {
    console.error("Login error:", error.message);
    return res.status(500).json({ message: "Login failed" });
  }
});

module.exports = router;
