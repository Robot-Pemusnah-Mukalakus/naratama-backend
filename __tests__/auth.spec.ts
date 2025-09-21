/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { UserRole } from "@prisma/client";
import bcrypt from "bcrypt";
import express from "express";
import session from "express-session";
import passport from "passport";
import request from "supertest";
import { beforeEach, describe, expect, it, MockedFunction, vi } from "vitest";

import authRouter from "../routes/auth.js";

// Mock Prisma
vi.mock("../lib/prisma.js", () => ({
  default: {
    user: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Mock bcrypt
vi.mock("bcrypt", () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn(),
  },
}));

// Mock passport - define the mock inline to avoid hoisting issues
vi.mock("../config/passport.js", () => {
  const mockAuthenticate = vi.fn();
  const mockInitialize = vi.fn(() => (req: any, res: any, next: any) => next());
  const mockSession = vi.fn(() => (req: any, res: any, next: any) => next());

  return {
    default: {
      authenticate: mockAuthenticate,
      initialize: mockInitialize,
      session: mockSession,
    },
  };
});

import passportMock from "../config/passport.js";
// Import mocked modules after vi.mock calls
import prisma from "../lib/prisma.js";

// Type assertions for mocked modules
const mockPrismaUser = prisma.user as unknown as {
  create: MockedFunction<any>;
  findFirst: MockedFunction<any>;
  findUnique: MockedFunction<any>;
  update: MockedFunction<any>;
};

const mockBcrypt = bcrypt as unknown as {
  compare: MockedFunction<typeof bcrypt.compare>;
  hash: MockedFunction<typeof bcrypt.hash>;
};

const mockPassport = passportMock as unknown as {
  authenticate: MockedFunction<any>;
  initialize: MockedFunction<any>;
  session: MockedFunction<any>;
};

// Test data
const mockUser = {
  createdAt: "2023-01-01T00:00:00.000Z",
  email: "john@example.com",
  id: "64f8a9b2c3d4e5f6a7b8c9d0",
  isActive: true,
  joinDate: "2023-01-01T00:00:00.000Z",
  lastLogin: "2023-01-01T00:00:00.000Z",
  membership: null,
  name: "John Doe",
  password: "$2b$12$hashedpassword",
  phoneNumber: "+1234567890",
  role: UserRole.USER,
  updatedAt: "2023-01-01T00:00:00.000Z",
};

const mockSessionUser = {
  email: mockUser.email,
  id: mockUser.id,
  isActive: mockUser.isActive,
  lastLogin: mockUser.lastLogin,
  membership: mockUser.membership,
  name: mockUser.name,
  phoneNumber: mockUser.phoneNumber,
  role: mockUser.role,
};

describe("Auth Routes", () => {
  let app: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();

    app = express();
    app.use(express.json());
    app.use(
      session({
        cookie: { secure: false },
        resave: false,
        saveUninitialized: false,
        secret: "test-secret",
      })
    );

    // Apply passport middleware
    app.use(passport.initialize());
    app.use(passport.session());

    // Setup request augmentation middleware
    app.use((req: any, res, next) => {
      req.logIn = vi.fn((user, callback) => {
        req.user = user;
        if (typeof callback === "function") {
          callback();
        }
      });
      req.logout = vi.fn((callback) => {
        req.user = undefined;
        if (typeof callback === "function") {
          callback();
        }
      });
      req.session = req.session ?? {};
      req.session.destroy = vi.fn((callback) => {
        if (typeof callback === "function") {
          callback();
        }
      });
      req.isAuthenticated = vi.fn(() => !!req.user);
      next();
    });

    app.use("/auth", authRouter);
  });

  describe("POST /auth/login", () => {
    it("should login successfully with valid credentials", async () => {
      mockPassport.authenticate.mockImplementation((strategy, callback) => {
        // return (req: any, res: any, next: any) => {
        //   callback(null, mockSessionUser, null);
        // };
        return;
      });

      const response = await request(app).post("/auth/login").send({
        email: "john@example.com",
        password: "password123",
      });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        message: "Login successful",
        success: true,
        user: {
          email: mockSessionUser.email,
          id: mockSessionUser.id,
          lastlogin: mockSessionUser.lastLogin,
          membership: mockSessionUser.membership,
          name: mockSessionUser.name,
          phoneNumber: mockSessionUser.phoneNumber,
          role: mockSessionUser.role,
        },
      });
    });

    it("should fail login with invalid credentials", async () => {
      mockPassport.authenticate.mockImplementation((strategy, callback) => {
        // return (req: any, res: any, next: any) => {
        //   callback(null, null, { message: "Invalid email or password" });
        // };
        return;
      });

      const response = await request(app).post("/auth/login").send({
        email: "john@example.com",
        password: "wrongpassword",
      });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        message: "Invalid email or password",
        success: false,
      });
    });

    it("should handle authentication errors", async () => {
      mockPassport.authenticate.mockImplementation((strategy, callback) => {
        // return (req: any, res: any, next: any) => {
        //   callback(new Error("Database error"), null, null);
        // };
        return;
      });

      const response = await request(app).post("/auth/login").send({
        email: "john@example.com",
        password: "password123",
      });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        error: "Database error",
        message: "Authentication error",
        success: false,
      });
    });

    it("should validate required fields", async () => {
      const response = await request(app).post("/auth/login").send({});

      expect(response.status).toBe(400);
    });
  });

  describe("POST /auth/register", () => {
    it("should register a new user successfully", async () => {
      mockPrismaUser.findFirst.mockResolvedValue(null);
      mockPrismaUser.create.mockResolvedValue(mockUser);
      mockBcrypt.hash.mockResolvedValue("$2b$12$hashedpassword" as never);

      const response = await request(app).post("/auth/register").send({
        email: "john@example.com",
        name: "John Doe",
        password: "Password_123",
        phoneNumber: "+1234567890",
      });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe(
        "User registered and logged in successfully"
      );
      expect(response.body.user).toMatchObject({
        email: "john@example.com",
        name: "John Doe",
        phoneNumber: "+1234567890",
      });

      expect(mockPrismaUser.create).toHaveBeenCalledWith({
        data: {
          email: "john@example.com",
          isActive: true,
          name: "John Doe",
          password: "$2b$12$hashedpassword",
          phoneNumber: "+1234567890",
        },
        include: {
          membership: true,
        },
      });

      expect(mockBcrypt.hash).toHaveBeenCalledWith("Password_123", 12);
    });

    it("should fail if user already exists", async () => {
      mockPrismaUser.findFirst.mockResolvedValue(mockUser);

      const response = await request(app).post("/auth/register").send({
        email: "john@example.com",
        name: "John Doe",
        password: "Password_123",
        phoneNumber: "+1234567890",
      });

      expect(response.status).toBe(409);
      expect(response.body).toEqual({
        message: "User with this phone number or email already exists",
        success: false,
      });
    });

    it("should handle database errors during registration", async () => {
      mockPrismaUser.findFirst.mockResolvedValue(null);
      mockPrismaUser.create.mockRejectedValue(new Error("Database error"));
      mockBcrypt.hash.mockResolvedValue("$2b$12$hashedpassword" as never);

      const response = await request(app).post("/auth/register").send({
        email: "john@example.com",
        name: "John Doe",
        password: "Password_123",
        phoneNumber: "+1234567890",
      });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        // error: expect.any(Object),
        message: "Registration failed",
        success: false,
      });
    });

    it("should validate required fields", async () => {
      const response = await request(app).post("/auth/register").send({});

      expect(response.status).toBe(400);
    });
  });

  describe("POST /auth/logout", () => {
    it("should require authentication", async () => {
      const response = await request(app).post("/auth/logout").send();

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        message: "Authentication required",
        success: false,
      });
    });

    it("should logout successfully when authenticated", async () => {
      // Create a new app instance with authentication
      const authApp = express();
      authApp.use(express.json());
      authApp.use(
        session({
          cookie: { secure: false },
          resave: false,
          saveUninitialized: false,
          secret: "test-secret",
        })
      );

      // Mock authenticated user
      authApp.use((req: any, res, next) => {
        req.user = mockSessionUser;
        req.logIn = vi.fn((user, callback) => {
          req.user = user;
          if (typeof callback === "function") callback();
        });
        req.logout = vi.fn((callback) => {
          req.user = undefined;
          if (typeof callback === "function") callback();
        });
        req.session = req.session ?? {};
        req.session.destroy = vi.fn((callback) => {
          if (typeof callback === "function") callback();
        });
        req.isAuthenticated = vi.fn(() => !!req.user);
        res.clearCookie = vi.fn();
        next();
      });

      authApp.use("/auth", authRouter);

      const response = await request(authApp).post("/auth/logout").send();

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        message: "Logout successful",
        success: true,
      });
    });
  });

  describe("GET /auth/me", () => {
    it("should return user info when authenticated", async () => {
      // Create a new app instance with authentication
      const authApp = express();
      authApp.use(express.json());

      // Mock authenticated user
      authApp.use((req: any, res, next) => {
        req.user = mockSessionUser;
        req.isAuthenticated = vi.fn(() => true);
        next();
      });

      authApp.use("/auth", authRouter);

      const response = await request(authApp).get("/auth/me");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        user: mockSessionUser,
      });
    });

    it("should require authentication", async () => {
      const response = await request(app).get("/auth/me");

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        message: "Authentication required",
        success: false,
      });
    });
  });

  describe("POST /auth/change-password", () => {
    it("should change password successfully when authenticated", async () => {
      mockPrismaUser.findUnique.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(true as never);
      mockBcrypt.hash.mockResolvedValue("$2b$12$newhashedpassword" as never);
      mockPrismaUser.update.mockResolvedValue({
        ...mockUser,
        password: "$2b$12$newhashedpassword",
      });

      // Create authenticated app
      const authApp = express();
      authApp.use(express.json());

      authApp.use((req: any, res, next) => {
        req.user = mockSessionUser;
        req.isAuthenticated = vi.fn(() => true);
        next();
      });

      authApp.use("/auth", authRouter);

      const response = await request(authApp)
        .post("/auth/change-password")
        .send({
          currentPassword: "oldpassword",
          newPassword: "newPassword_123",
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        message: "Password changed successfully",
        success: true,
      });

      expect(mockPrismaUser.findUnique).toHaveBeenCalledWith({
        where: { id: mockSessionUser.id },
      });

      expect(mockBcrypt.compare).toHaveBeenCalledWith(
        "oldpassword",
        mockUser.password
      );
      expect(mockBcrypt.hash).toHaveBeenCalledWith("newPassword_123", 12);
    });

    it("should require authentication", async () => {
      const response = await request(app).post("/auth/change-password").send({
        currentPassword: "oldpassword",
        newPassword: "newPassword_123",
      });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        message: "Authentication required",
        success: false,
      });
    });

    it("should validate required fields", async () => {
      const response = await request(app)
        .post("/auth/change-password")
        .send({});

      expect(response.status).toBe(401);
    });
  });

  describe("POST /auth/set-password", () => {
    it("should set password for user without password", async () => {
      const userWithoutPassword = { ...mockUser, password: null };
      mockPrismaUser.findUnique.mockResolvedValue(userWithoutPassword);
      mockBcrypt.hash.mockResolvedValue("$2b$12$hashedpassword" as never);
      mockPrismaUser.update.mockResolvedValue(mockUser);

      const response = await request(app).post("/auth/set-password").send({
        email: "john@example.com",
        password: "Password_123",
      });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        message: "Password set successfully. You can now login.",
        success: true,
      });

      expect(mockPrismaUser.findUnique).toHaveBeenCalledWith({
        where: { email: "john@example.com" },
      });

      expect(mockBcrypt.hash).toHaveBeenCalledWith("Password_123", 12);

      expect(mockPrismaUser.update).toHaveBeenCalledWith({
        data: { password: "$2b$12$hashedpassword" },
        where: { id: mockUser.id },
      });
    });

    it("should fail if user not found", async () => {
      mockPrismaUser.findUnique.mockResolvedValue(null);

      const response = await request(app).post("/auth/set-password").send({
        email: "nonexistent@example.com",
        password: "Password_123",
      });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        message: "User not found",
        success: false,
      });
    });

    it("should fail if password already set", async () => {
      mockPrismaUser.findUnique.mockResolvedValue(mockUser);

      const response = await request(app).post("/auth/set-password").send({
        email: "john@example.com",
        password: "Password_123",
      });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        message: "Password already set. Use change password instead.",
        success: false,
      });
    });

    it("should validate required fields", async () => {
      const response = await request(app).post("/auth/set-password").send({});

      expect(response.status).toBe(400);
    });

    it("should handle database errors", async () => {
      const userWithoutPassword = { ...mockUser, password: null };
      mockPrismaUser.findUnique.mockResolvedValue(userWithoutPassword);
      mockBcrypt.hash.mockResolvedValue("$2b$12$hashedpassword" as never);
      mockPrismaUser.update.mockRejectedValue(new Error("Database error"));

      const response = await request(app).post("/auth/set-password").send({
        email: "john@example.com",
        password: "Password_123",
      });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        message: "Failed to set password",
        success: false,
      });
    });
  });
});
