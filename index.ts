/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
import passport from "#config/passport.js";
import prisma from "#lib/prisma.js";
import announcementRoutes from "#routes/announcements.js";
import authRoutes from "#routes/auth.js";
import bookLoanRoutes from "#routes/book-loans.js";
import booksAdvancedRoutes from "#routes/books-advanced.js";
import bookRoutes from "#routes/books.js";
import roomRoutes from "#routes/rooms.js";
import userRoutes from "#routes/users.js";
import bodyParser from "body-parser";
import MongoStore from "connect-mongo";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import session from "express-session";

dotenv.config();

const PORT = process.env.PORT ?? 8080;
const app = express();

// CORS configuration
app.use(
  cors({
    credentials: true,
    origin: process.env.FRONTEND_URL ?? "http://localhost:3000",
  })
);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

// configuration
app.use(
  session({
    cookie: {
      httpOnly: true, // xss
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30d
      sameSite: "lax", // CSRF
      secure: process.env.NODE_ENV === "production",
    },
    resave: false,
    saveUninitialized: false,
    secret: process.env.SESSION_SECRET ?? "secretcuy",
    store: MongoStore.create({
      collectionName: "sessions",
      mongoUrl: process.env.DATABASE_URL ?? process.env.MONGODB_URI,
      ttl: 30 * 24 * 60 * 60, // 30d
    }),
  })
);

// passport
app.use(passport.initialize());
app.use(passport.session());

// ============== ROUTES ==============
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/announcements", announcementRoutes);
app.use("/api/books", bookRoutes);
app.use("/api/book-loans", bookLoanRoutes);
app.use("/api/books-advanced", booksAdvancedRoutes);
app.use("/api/rooms", roomRoutes);

app.use("/", (req, res) => {
  res.json({
    message: "Naratama Library API Server",
    version: "1.0.0",
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

await testConnection();

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
