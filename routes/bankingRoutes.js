const express = require("express");
const { nibssRequest } = require("../services/nibssService");
const { accounts, transactions, saveData } = require("../data/store");
const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/name-enquiry/:accountNumber", async (req, res) => {
  try {
    const { accountNumber } = req.params;

    const result = await nibssRequest(
      "GET",
      `/api/account/name-enquiry/${accountNumber}`
    );

    res.json({
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

    res.status(500).json({
      message: "Name enquiry failed"
    });
  }
});

router.post("/transfer", authenticateToken, async (req, res) => {
  try {
    const { from, to, amount } = req.body;

  if (!from || !to || amount === undefined) {
  return res.status(400).json({
    message: "From account, to account, and amount are required"
  });
}

if (typeof amount !== "number" || amount <= 0) {
  return res.status(400).json({
    message: "Transfer amount must be a positive number"
  });
}
const senderAccount = accounts.find(
  account => account.accountNumber === from
);

if (!senderAccount) {
  return res.status(404).json({
    message: "Sender account not found"
  });
}

if (senderAccount.customerId !== req.user.customerId) {
  return res.status(403).json({
    message: "You can only transfer from your own account"
  });
}

    const result = await nibssRequest("POST", "/api/transfer", {
      from,
      to,
      amount
    });


const transaction = {
  reference: result.reference,
  customerId: senderAccount?.customerId || null,
  from,
  to,
  amount,
  status: result.status
};

    transactions.push(transaction);
    saveData();

   res.status(result.status === "SUCCESS" ? 201 : 200).json({
  message:
    result.status === "SUCCESS"
      ? "Transfer successful"
      : "Transfer was not successful",
  transaction
});
  } catch (error) {
    console.error(
      "Transfer error:",
      error.response?.data || error.message
    );

    res.status(500).json({
      message: "Transfer failed"
    });
  }
});

router.get("/transaction/:reference", authenticateToken, async (req, res) => {
  try {
    const { reference } = req.params;
    
    const localTransaction = transactions.find(
  transaction => transaction.reference === reference
);

if (!localTransaction) {
  return res.status(404).json({
    message: "Transaction not found"
  });
}

console.log("Transaction customerId:", localTransaction.customerId);
console.log("Logged-in customerId:", req.user.customerId);

if (localTransaction.customerId !== req.user.customerId) {
  return res.status(403).json({
    message: "You can only access your own transaction"
  });
}

    const result = await nibssRequest(
      "GET",
      `/api/transaction/${reference}`
    );

    res.json({
      message: "Transaction retrieved successfully",
      transaction: result
    });
  } catch (error) {
    console.error(
      "Transaction status error:",
      error.response?.data || error.message
    );

    res.status(500).json({
      message: "Transaction status check failed"
    });
  }
});

router.get("/balance/:accountNumber", authenticateToken, async (req, res) => {
  try {
    const { accountNumber } = req.params;
    
    const account = accounts.find(
  account => account.accountNumber === accountNumber
);

if (!account) {
  return res.status(404).json({
    message: "Account not found"
  });
}

if (account.customerId !== req.user.customerId) {
  return res.status(403).json({
    message: "You can only access your own account balance"
  });
}

    const result = await nibssRequest(
      "GET",
      `/api/account/balance/${accountNumber}`
    );

    res.json({
      message: "Balance retrieved successfully",
      balance: result
    });
  } catch (error) {
    console.error(
      "Balance check error:",
      error.response?.data || error.message
    );

    res.status(500).json({
      message: "Balance check failed"
    });
  }
});

router.get("/transactions/:customerId", authenticateToken, (req, res) => {
  try {
    const customerId = Number(req.params.customerId);

    if (req.user.customerId !== customerId) {
      return res.status(403).json({
        message: "You can only access your own transaction history"
      });
    }

    const customerTransactions = transactions.filter(
      transaction => transaction.customerId === customerId
    );

    res.json({
      message: "Transaction history retrieved successfully",
      transactions: customerTransactions
    });
  } catch (error) {
    console.error(
      "Transaction history error:",
      error.message
    );

    res.status(500).json({
      message: "Unable to retrieve transaction history"
    });
  }
});


router.post("/webhook", (req, res) => {
  try {
    const event = req.headers["x-webhook-event"];

    if (event !== "INWARD_TRANSACTION") {
      return res.status(400).json({
        message: "Unsupported webhook event"
      });
    }

    const { data } = req.body;

    if (
      !data ||
      !data.reference ||
      !data.receiverAccount ||
      data.amount === undefined ||
      !data.status
    ) {
      return res.status(400).json({
        message: "Webhook data is missing required fields"
      });
    }

    // Prevent the same transaction from being saved twice.
    const existingTransaction = transactions.find(
      (transaction) =>
        transaction.reference === data.reference
    );

    if (existingTransaction) {
      return res.status(200).json({
        message: "Transaction already received"
      });
    }

    // Find the local account receiving the money.
    const receivingAccount = accounts.find(
      (account) =>
        account.accountNumber === data.receiverAccount
    );

    const transaction = {
      reference: data.reference,
      customerId: receivingAccount
        ? receivingAccount.customerId
        : null,
      from: data.senderAccount,
      to: data.receiverAccount,
      amount: data.amount,
      status: data.status
    };

    transactions.push(transaction);
    saveData();

    return res.status(200).json({
      message: "Webhook received successfully"
    });
  } catch (error) {
    console.error("Webhook error:", error.message);

    return res.status(500).json({
      message: "Webhook processing failed"
    });
  }
});

module.exports = router;