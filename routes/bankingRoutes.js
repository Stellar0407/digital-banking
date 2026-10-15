const express = require("express");
const mongoose = require("mongoose");
const { nibssRequest } = require("../services/nibssService");
const Account = require("../models/Account");
const Transaction = require("../models/Transaction");
const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();

// Name enquiry
router.get("/name-enquiry/:accountNumber", async (req, res) => {
  try {
    const { accountNumber } = req.params;

    const result = await nibssRequest(
      "GET",
      `/api/account/name-enquiry/${accountNumber}`
    );

    return res.json({
      message: "Name enquiry successful",
      accountName: result.accountName,
      accountNumber: result.accountNumber,
      bankCode: result.bankCode
    });
  } catch (error) {
    console.error(
      "Name enquiry error:",
      error.response?.data || error.message
    );

    return res.status(500).json({
      message: "Name enquiry failed"
    });
  }
});


 // Transfer money
router.post("/transfer", authenticateToken, async (req, res) => {
  try {
    const { from, to, amount } = req.body;

    if (!from || !to || amount === undefined) {
      return res.status(400).json({
        message: "From account, to account, and amount are required"
      });
    }

    if (
      typeof amount !== "number" ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return res.status(400).json({
        message: "Transfer amount must be a positive number"
      });
    }

    if (from === to) {
      return res.status(400).json({
        message: "Sender and receiver accounts must be different"
      });
    }

    const senderAccount = await Account.findOne({
      accountNumber: from
    });

    if (!senderAccount) {
      return res.status(404).json({
        message: "Sender account not found"
      });
    }

    if (
      Number(senderAccount.customerId) !==
      Number(req.user.customerId)
    ) {
      return res.status(403).json({
        message: "You can only transfer from your own account"
      });
    }

    // NIBSS processes the transfer.
    const result = await nibssRequest("POST", "/api/transfer", {
      from,
      to,
      amount
    });

    if (result.status !== "SUCCESS" || !result.reference) {
      return res.status(200).json({
        message: "Transfer was not confirmed as successful",
        transaction: result
      });
    }

    // Save the successful transaction locally.
    let transaction;

    try {
      transaction = await Transaction.create({
        reference: result.reference,
        customerId: senderAccount.customerId,
        from,
        to,
        amount,
        status: result.status
      });
    } catch (error) {
      if (error.code === 11000) {
        console.error(
          "NIBSS returned a transaction reference already stored locally:",
          result.reference
        );

        return res.status(200).json({
          message:
            "NIBSS reported success, but this transaction reference already exists locally. Verify its details before retrying.",
          reference: result.reference
        });
      }

      console.error(
        "Transfer succeeded at NIBSS, but local transaction recording failed:",
        error.message
      );

      return res.status(202).json({
        message:
          "NIBSS reported success, but the local transaction record could not be saved. Reconcile the transaction before retrying.",
        reference: result.reference
      });
    }

    // Refresh the local sender balance separately.
    let balanceSynced = false;

    try {
      const balanceResult = await nibssRequest(
        "GET",
        `/api/account/balance/${from}`
      );

      const currentBalance = Number(balanceResult?.balance);

      if (
        balanceResult?.accountNumber === from &&
        Number.isFinite(currentBalance) &&
        currentBalance >= 0
      ) {
        senderAccount.balance = currentBalance;
        await senderAccount.save();
        balanceSynced = true;
      } else {
        console.error(
          "NIBSS returned an unexpected balance response after transfer."
        );
      }
    } catch (error) {
      console.error(
        "Transfer succeeded, but sender balance refresh failed:",
        error.message
      );
    }

    return res.status(201).json({
      message: balanceSynced
        ? "Transfer successful; sender balance synchronized"
        : "Transfer successful; sender balance synchronization is pending",
      transaction,
      balanceSynced
    });
  } catch (error) {
    console.error(
      "Transfer request error:",
      error.response?.data || error.message
    );

    return res.status(500).json({
      message:
        "Transfer outcome could not be confirmed. Check the transaction status before attempting another transfer."
    });
  }
});

// Check transaction status
router.get(
  "/transaction/:reference",
  authenticateToken,
  async (req, res) => {
    try {
      const { reference } = req.params;

      const localTransaction = await Transaction.findOne({
        reference
      });

      if (!localTransaction) {
        return res.status(404).json({
          message: "Transaction not found in local records"
        });
      }

      if (
        Number(localTransaction.customerId) !==
        Number(req.user.customerId)
      ) {
        return res.status(403).json({
          message: "You can only access your own transaction"
        });
      }

      const result = await nibssRequest(
        "GET",
        `/api/transaction/${reference}`
      );

      return res.status(200).json({
        message: "Transaction retrieved successfully",
        transaction: result
      });
    } catch (error) {
      console.error(
        "Transaction status error:",
        error.response?.data || error.message
      );

      return res.status(500).json({
        message: "Transaction status check failed"
      });
    }
  }
);

// Check account balance
router.get(
  "/balance/:accountNumber",
  authenticateToken,
  async (req, res) => {
    try {
      const { accountNumber } = req.params;

      const account = await Account.findOne({
        accountNumber
      });

      if (!account) {
        return res.status(404).json({
          message: "Account not found"
        });
      }

      if (
        Number(account.customerId) !== Number(req.user.customerId)
      ) {
        return res.status(403).json({
          message: "You can only access your own account balance"
        });
      }

      const result = await nibssRequest(
        "GET",
        `/api/account/balance/${accountNumber}`
      );

      return res.json({
        message: "Balance retrieved successfully",
        balance: result
      });
    } catch (error) {
      console.error(
        "Balance check error:",
        error.response?.data || error.message
      );

      return res.status(500).json({
        message: "Balance check failed"
      });
    }
  }
);

// View your own transaction history
router.get(
  "/transactions/:customerId",
  authenticateToken,
  async (req, res) => {
    try {
      const customerId = Number(req.params.customerId);

      if (
        !Number.isFinite(customerId) ||
        Number(req.user.customerId) !== customerId
      ) {
        return res.status(403).json({
          message: "You can only access your own transaction history"
        });
      }

      const customerTransactions = await Transaction.find({
        customerId
      }).sort({ createdAt: -1 });

      return res.json({
        message: "Transaction history retrieved successfully",
        transactions: customerTransactions
      });
    } catch (error) {
      console.error("Transaction history error:", error.message);

      return res.status(500).json({
        message: "Unable to retrieve transaction history"
      });
    }
  }
);

// Receive inward transaction notifications from NIBSS
router.post("/webhook", async (req, res) => {
  let session;

  try {
    const event = req.headers["x-webhook-event"];

    if (event !== "INWARD_TRANSACTION") {
      return res.status(400).json({
        message: "Unsupported webhook event"
      });
    }

    const { data } = req.body || {};

    if (
      !data ||
      !data.reference ||
      !data.receiverAccount ||
      !data.senderAccount ||
      data.amount === undefined ||
      !Number.isFinite(Number(data.amount)) ||
      Number(data.amount) <= 0 ||
      !data.status
    ) {
      return res.status(400).json({
        message: "Webhook data is missing required fields"
      });
    }

    if (data.status !== "SUCCESS") {
      return res.status(200).json({
        message: "Transaction was not successful; no balance update made"
      });
    }

    session = await mongoose.startSession();

    let transactionAlreadyReceived = false;

    await session.withTransaction(async () => {
      const existingTransaction = await Transaction.findOne({
        reference: data.reference
      }).session(session);

      if (existingTransaction) {
        transactionAlreadyReceived = true;
        return;
      }

      const receivingAccount = await Account.findOne({
        accountNumber: data.receiverAccount
      }).session(session);

      if (!receivingAccount) {
        const error = new Error("Receiving account not found");
        error.statusCode = 404;
        throw error;
      }

      await Transaction.create(
        [{
          reference: data.reference,
          customerId: receivingAccount.customerId,
          from: data.senderAccount,
          to: data.receiverAccount,
          amount: Number(data.amount),
          status: data.status
        }],
        { session }
      );

      receivingAccount.balance += Number(data.amount);
      await receivingAccount.save({ session });
    });

    if (transactionAlreadyReceived) {
      return res.status(200).json({
        message: "Transaction already received"
      });
    }

    return res.status(200).json({
      message: "Inward transaction processed successfully"
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(200).json({
        message: "Transaction already received"
      });
    }

    if (error.statusCode === 404) {
      return res.status(404).json({
        message: error.message
      });
    }

    console.error("Webhook error:", error.message);

    return res.status(500).json({
      message: "Webhook processing failed"
    });
  } finally {
    if (session) {
      await session.endSession();
    }
  }
});

module.exports = router;