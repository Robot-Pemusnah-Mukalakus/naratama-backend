import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import session from "express-session";
import MongoStore from "connect-mongo";
import dotenv from "dotenv";
import prisma from "./lib/prisma.js";
import passport from "./config/passport.js";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";

dotenv.config();

const PORT = process.env.PORT || 8080;
const app = express();

// CORS configuration
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

// configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || "secretcuy",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.DATABASE_URL || process.env.MONGODB_URI,
      collectionName: "sessions",
      ttl: 30 * 24 * 60 * 60, // 30d
    }),
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30d
      httpOnly: true, // xss
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax", // CSRF
    },
  })
);

// passport
app.use(passport.initialize());
app.use(passport.session());

// ============== ROUTES ==============
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

app.use("/", (req, res) => {
  res.json({
    message: "Naratama Library API Server",
    version: "1.0.0",
    endpoints: {
      auth: "/api/auth",
      users: "/api/users",
    },
  });
});

const testConnection = async () => {
  try {
    await prisma.$connect();
    console.log("Prisma connected to database successfully");
  } catch (error) {
    console.error("Database connection failed:", error);
    process.exit(1);
  }
};

testConnection();

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// graceful shutdown
process.on("SIGINT", async () => {
  console.log("\nShutting down gracefully...");
  await prisma.$disconnect();
  console.log("Database disconnected");
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\nShutting down gracefully...");
  await prisma.$disconnect();
  console.log("Database disconnected");
  process.exit(0);
});
