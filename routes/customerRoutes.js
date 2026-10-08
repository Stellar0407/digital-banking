const express = require("express");
const jwt = require("jsonwebtoken");
const { nibssRequest } = require("../services/nibssService");
const { customers, accounts, saveData } = require("../data/store");
const router = express.Router();

router.post("/bvn", async (req, res) => {
  try {
    const { bvn, firstName, lastName, dob, phone } = req.body;

    const result = await nibssRequest("POST", "/api/insertBvn", {
      bvn,
      firstName,
      lastName,
      dob,
      phone
    });

    const customer = {
      id: customers.length + 1,
      firstName,
      lastName,
      phone,
      kycType: "bvn",
      kycId: bvn,
      kycVerified: false
    };

    customers.push(customer);
    saveData();

res.status(201).json({
      message: "BVN onboarding successful",
      customer,
      nibssResponse: result
    });
  } catch (error) {
    console.error(
      "BVN onboarding error:",
      error.response?.data || error.message
    );

    res.status(500).json({
      message: "BVN onboarding failed"
    });
  }
});

router.post("/bvn/validate", async (req, res) => {
  try {
    const { bvn } = req.body;

    const result = await nibssRequest("POST", "/api/validateBvn", {
      bvn
    });

    const customer = customers.find(
      (customer) => customer.kycType === "bvn" && customer.kycId === bvn
    );

    if (!customer) {
      return res.status(404).json({
        message: "Customer not found"
      });
    }

    customer.kycVerified = true;
    saveData();

    res.json({
      message: "BVN validation successful",
      customer,
      nibssResponse: result
    });
  } catch (error) {
    console.error(
      "BVN validation error:",
      error.response?.data || error.message
    );

    res.status(500).json({
      message: "BVN validation failed"
    });
  }
});

router.post("/nin", async (req, res) => {
  try {
    const { nin, firstName, lastName, dob } = req.body;

    const result = await nibssRequest("POST", "/api/insertNin", {
      nin,
      firstName,
      lastName,
      dob
    });

    const customer = {
      id: customers.length + 1,
      firstName,
      lastName,
      kycType: "nin",
      kycId: nin,
      kycVerified: false
    };

    customers.push(customer);
    saveData();

    res.status(201).json({
      message: "NIN onboarding successful",
      customer,
      nibssResponse: result
    });
  } catch (error) {
    console.error(
      "NIN onboarding error:",
      error.response?.data || error.message
    );

    res.status(500).json({
      message: "NIN onboarding failed"
    });
  }
});
router.post("/nin/validate", async (req, res) => {
  try {
    const { nin } = req.body;

    const result = await nibssRequest("POST", "/api/validateNin", {
      nin
    });

    const customer = customers.find(
      (customer) => customer.kycType === "nin" && customer.kycId === nin
    );

    if (!customer) {
      return res.status(404).json({
        message: "Customer not found"
      });
    }

    customer.kycVerified = true;
    saveData();

    res.json({
      message: "NIN validation successful",
      customer,
      nibssResponse: result
    });
  } catch (error) {
    console.error(
      "NIN validation error:",
      error.response?.data || error.message
    );

    res.status(500).json({
      message: "NIN validation failed"
    });
  }
});
router.post("/account", async (req, res) => {
  try {
    const { customerId, kycType, kycId, dob } = req.body;

    const customer = customers.find(
      (customer) =>
        customer.id === Number(customerId) &&
        customer.kycType === kycType &&
        customer.kycId === kycId
    );

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

    const existingAccount = accounts.find(
      (account) => account.customerId === customer.id
    );

    if (existingAccount) {
      return res.status(400).json({
        message: "Customer already has an account"
      });
    }

    const result = await nibssRequest("POST", "/api/account/create", {
      kycType,
      kycID: kycId,
      dob
    });

    const account = {
      id: accounts.length + 1,
      customerId: customer.id,
      accountNumber: result.account.accountNumber,
      accountName: result.account.accountName,
      bankCode: result.account.bankCode,
      balance: result.account.balance
    };

    accounts.push(account);
    saveData();

    res.status(201).json({
      message: "Account created successfully",
      account,
      nibssResponse: result
    });
  } catch (error) {
    console.error(
      "Account creation error:",
      error.response?.data || error.message
    );

    res.status(500).json({
      message: "Account creation failed"
    });
  }
});

router.post("/login", (req, res) => {
  try {
    const { customerId, kycId } = req.body;

    const customer = customers.find(
      (customer) =>
        customer.id === Number(customerId) &&
        customer.kycId === kycId
    );

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
      {
        customerId: customer.id
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1h"
      }
    );

    res.json({
      message: "Login successful",
      token
    });
  } catch (error) {
    console.error("Login error:", error.message);

    res.status(500).json({
      message: "Login failed"
    });
  }
});

module.exports = router;