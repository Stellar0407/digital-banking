# STE Bank Nova - Digital Banking API

## Project Overview

STE Bank Nova is a digital banking backend API built with Node.js and Express.js. It integrates with the NIBSS sandbox to support customer onboarding, KYC verification, bank account creation, balance enquiries, transfers, and transaction tracking.

The application uses MongoDB to store customer, account, and transaction records.

## Live API

- **Base URL:** https://stella-digital-banking.onrender.com
- **NIBSS API Documentation:** https://nibssbyphoenix.onrender.com/api/docs/#/
- **GitHub Repository:** https://github.com/Stellar0407/digital-banking

## Technologies Used

- Node.js
- Express.js
- MongoDB and Mongoose
- JSON Web Tokens (JWT)
- NIBSS sandbox API
- Render
- Git and GitHub

## Key Features

- Customer onboarding using BVN or NIN.
- KYC validation before account creation.
- Bank account creation through the NIBSS sandbox.
- Initial account funding of â‚¦15,000 through the sandbox account-creation process.
- Account name enquiry.
- Balance retrieval and synchronization with NIBSS.
- Banking transfers and transaction-status enquiries.
- Customer transaction history.
- JWT authentication for protected endpoints.
- Customer ownership and authorization checks.
- Inward transaction webhook handling and duplicate-reference checks.

## Customer Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/customers/bvn` | Create a BVN customer record |
| POST | `/api/customers/bvn/validate` | Validate BVN details |
| POST | `/api/customers/nin` | Create a NIN customer record |
| POST | `/api/customers/nin/validate` | Validate NIN details |
| POST | `/api/customers/account` | Create a bank account |
| POST | `/api/customers/login` | Authenticate a customer |

## Banking Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/banking/name-enquiry/:accountNumber` | Enquire about an account name |
| POST | `/api/banking/transfer` | Initiate a transfer |
| GET | `/api/banking/transaction/:reference` | Check transaction status |
| GET | `/api/banking/balance/:accountNumber` | Retrieve an account balance |
| GET | `/api/banking/transactions/:customerId` | Retrieve a customer's transaction history |
| POST | `/api/banking/webhook` | Receive inward transaction notifications |

Protected endpoints require a valid bearer token. Check the implementation for the exact request fields and response formats.

## Setup Instructions

### Prerequisites

- Node.js and npm
- A MongoDB connection
- NIBSS sandbox API credentials

### Installation

1. Clone the repository:

   `git clone https://github.com/Stellar0407/digital-banking.git`

2. Navigate into the project folder:

   `cd digital-banking`

3. Install the dependencies:

   `npm install`

4. Create a `.env` file in the project root and configure these environment variables:

   - `MONGODB_URI`
   - `NIBSS_BASE_URL`
   - `NIBSS_API_KEY`
   - `NIBSS_API_SECRET`

   Use your own authorized credentials. Never commit real credentials or access tokens to GitHub.

5. Start the application using the command configured in `package.json`. If `server.js` is the entry point and no start script is configured, run:

   `node server.js`

## Security and Validation

- KYC verification is required before account creation.
- Protected balance and transaction-history routes enforce customer ownership checks.
- Transfer requests validate required fields and positive amounts.
- Duplicate transaction references are checked during inward webhook processing.
- Webhook callback authentication has not been verified against NIBSS documentation. The event-header check alone does not authenticate the sender and is insufficient for production security.

## Testing

Testing has covered API availability, input validation, authentication failures, balance retrieval, transaction-status checks, and customer transaction-history isolation.

Further testing should cover intra-bank and inter-bank transfers, account-creation restrictions, webhook behavior, and balance synchronization.

## Deployment

The application is deployed on Render:

https://stella-digital-banking.onrender.com

## Author

Developed as a backend engineering digital banking assignment.
'@ | Set-Content -Path README.md -Encoding utf8
