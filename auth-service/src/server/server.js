require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { PrismaClient } = require("@prisma/client");

const AuthRouter = require("../routes/auth");

const app = express();
const PORT = process.env.PORT || 4001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Prisma Client
const prisma = new PrismaClient();

// Check Database Connection
async function connectDB() {
  try {
    await prisma.$connect();
    console.log("✅ Auth Service connected to PostgreSQL using Prisma");
  } catch (error) {
    console.error("❌ DB Connection Error:", error);
    process.exit(1);
  }
}
connectDB();

// Routes
app.use("/auth", AuthRouter);

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Auth Service is running on port ${PORT}`);
});

