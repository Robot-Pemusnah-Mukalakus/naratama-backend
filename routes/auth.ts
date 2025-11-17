/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Prisma } from "@prisma/client";
import bcrypt from "bcrypt";
import express from "express";

import passport from "../config/passport.js";
import prisma from "../lib/prisma.js";
import { checkAuth } from "../middleware/auth.js";
import { SessionUser } from "../middleware/auth.js";
import { validateSchema } from "../middleware/validation.js";
import {
  ChangePasswordSchema,
  LoginSchema,
  RegisterSchema,
  SetPasswordSchema,
} from "../validations/index.js";

const router = express.Router();

// POST /api/auth/login
router.post("/login", validateSchema(LoginSchema), (req, res, next) => {
  passport.authenticate(
    "local",
    (err: any, user: null | SessionUser, info: any) => {
      if (err) {
        return res.status(500).json({
          error: err.message,
          message: "Authentication error",
          success: false,
        });
      }

      if (!user) {
        return res.status(401).json({
          message: info?.message ?? "Authentication failed",
          success: false,
        });
      }

      // (create session)
      req.logIn(user, (err) => {
        if (err) {
          return res.status(500).json({
            error: err.message,
            message: "Login error",
            success: false,
          });
        }

        return res.json({
          message: "Login successful",
          success: true,
          user: {
            email: user.email,
            id: user.id,
            lastlogin: new Date(user.lastLogin ?? Date.now()),
            membership: user.membership,
            name: user.name,
            phoneNumber: user.phoneNumber,
            role: user.role,
          },
        });
      });
    }
  )(req, res, next);
});

// GET /api/auth/google
router.get(
  "/google",
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// GET /api/auth/google/callback
router.get(
  "/google/callback",
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  passport.authenticate("google", {
    failureRedirect: "/auth/login?error=Authentication%20failed",
  }),
  (req, res) => {
    // After successful Google OAuth, redirect to frontend success page
    // The session cookie is already set by passport
    res.redirect("http://localhost:3000/auth/success");
  }
);

// POST /api/auth/register
router.post("/register", validateSchema(RegisterSchema), async (req, res) => {
  try {
    const { email, name, password, phoneNumber } =
      req.body as Prisma.UserCreateInput;

    // if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email, phoneNumber }].filter(Boolean),
      },
    });

    if (existingUser) {
      return res.status(409).json({
        message: "User with this phone number or email already exists",
        success: false,
      });
    }

    // hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // create user
    const newUser = await prisma.user.create({
      data: {
        email: email,
        isActive: true,
        name,
        password: hashedPassword,
        phoneNumber,
      },
      include: {
        membership: true,
      },
    });

    const now = new Date();

    const user: Express.User = {
      email: newUser.email,
      id: newUser.id,
      isActive: newUser.isActive,
      lastLogin: now,
      membership: newUser.membership,
      name: newUser.name,
      phoneNumber: newUser.phoneNumber,
      role: newUser.role,
    };

    // Auto-login after registration
    req.logIn(user, (err) => {
      if (err) {
        return res.status(201).json({
          message: "User registered successfully, but auto-login failed",
          success: true,
          user,
        });
      }

      return res.status(201).json({
        message: "User registered and logged in successfully",
        success: true,
        user,
      });
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      error: process.env.NODE_ENV === "development" ? error : undefined,
      message: "Registration failed",
      success: false,
    });
  }
});

// POST /api/auth/logout
router.post("/logout", checkAuth, (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({
        error: err.message,
        message: "Logout error",
        success: false,
      });
    }

    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({
          error: err.message,
          message: "Session destruction error",
          success: false,
        });
      }

      res.clearCookie("connect.sid"); // Clear session cookie
      res.json({
        message: "Logout successful",
        success: true,
      });
    });
  });
});

// GET /api/auth/me
router.get("/me", checkAuth, (req, res) => {
  res.json({
    success: true,
    user: req.user,
  });
});

// POST /api/auth/change-password
router.post(
  "/change-password",
  checkAuth,
  validateSchema(ChangePasswordSchema),
  async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body as {
        currentPassword: string;
        newPassword: string;
      };

      // Get user with password
      const user = await prisma.user.findUnique({
        where: { id: req.user?.id },
      });

      if (!user?.password) {
        return res.status(404).json({
          message: "User not found or password not set",
          success: false,
        });
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(
        currentPassword,
        user.password
      );
      if (!isCurrentPasswordValid) {
        return res.status(401).json({
          message: "Current password is incorrect",
          success: false,
        });
      }

      // Hash new password
      const saltRounds = 12;
      const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      await prisma.user.update({
        data: { password: hashedNewPassword },
        where: { id: user.id },
      });

      res.json({
        message: "Password changed successfully",
        success: true,
      });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({
        error: process.env.NODE_ENV === "development" ? error : undefined,
        message: "Failed to change password",
        success: false,
      });
    }
  }
);

// POST /api/auth/set-password
router.post(
  "/set-password",
  validateSchema(SetPasswordSchema),
  async (req, res) => {
    try {
      const { email, password } = req.body as Prisma.UserCreateInput;

      // Find user
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        return res.status(404).json({
          message: "User not found",
          success: false,
        });
      }

      if (user.password) {
        return res.status(400).json({
          message: "Password already set. Use change password instead.",
          success: false,
        });
      }

      // Hash password
      const saltRounds = 12;

      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Update user with password
      await prisma.user.update({
        data: { password: hashedPassword },
        where: { id: user.id },
      });

      res.json({
        message: "Password set successfully. You can now login.",
        success: true,
      });
    } catch (error) {
      console.error("Set password error:", error);
      res.status(500).json({
        error: process.env.NODE_ENV === "development" ? error : undefined,
        message: "Failed to set password",
        success: false,
      });
    }
  }
);

export default router;
