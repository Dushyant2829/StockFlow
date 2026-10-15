# StockFlow — Inventory Management System

StockFlow is a web-based inventory management application designed to help users manage products, monitor stock levels, and maintain inventory records.

## Features

- Secure login with session-based authentication
- Dashboard for inventory overview
- Add, edit, and delete products
- Search and filter inventory
- Low-stock monitoring
- MySQL database integration
- Input validation and protected API routes

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Node.js, Express.js
- **Database:** MySQL
- **Authentication:** Express sessions and bcrypt
- **Version Control:** Git and GitHub

## Project Structure

```text
StockFlow/
├── backend/
│   ├── server.js
│   ├── db.js
│   ├── package.json
│   └── .env.example
├── login/
│   ├── login.html
│   ├── login.css
│   └── login.js
├── index.html
├── script.js
├── style.css
└── README.md
```

## Prerequisites

- Node.js and npm
- MySQL
- Git

## Local Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/Dushyant2829/StockFlow.git
   cd StockFlow
   ```

2. Install frontend project dependencies, if required:

   ```bash
   npm install
   ```

3. Install backend dependencies:

   ```bash
   cd backend
   npm install
   ```

4. Create a local `.env` file using `backend/.env.example` as a reference. Fill in your own database configuration and session secret. Never commit this file.

5. Create the `stockflow` MySQL database and configure the required tables.

6. Start the backend:

   ```bash
   node server.js
   ```

7. Serve the frontend using VS Code Live Server. Open the login page through your configured local frontend address.

## Security Notes

- Environment variables and cookie files should remain local and must not be committed.
- The application is configured for local development. Production deployment requires appropriate HTTPS, secure cookie settings, and production session storage.

## Author

Dushyant Dubey
