import express from "express";
import bcrypt from "bcrypt";
import passport from "../config/passport.js";
import prisma from "../lib/prisma.js";
import { checkAuth } from "../middleware/auth.js";
import { validateSchema } from "../middleware/validation.js";
import {
  LoginSchema,
  RegisterSchema,
  ChangePasswordSchema,
  SetPasswordSchema,
} from "../validations/index.js";
import { SessionUser } from "../middleware/auth.js";

const router = express.Router();

// POST /api/auth/login
router.post("/login", validateSchema(LoginSchema), (req, res, next) => {
  passport.authenticate(
    "local",
    (err: any, user: SessionUser | null, info: any) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "Authentication error",
          error: err.message,
        });
      }

      if (!user) {
        return res.status(401).json({
          success: false,
          message: info?.message || "Authentication failed",
        });
      }

      // (create session)
      req.logIn(user, (err) => {
        if (err) {
          return res.status(500).json({
            success: false,
            message: "Login error",
            error: err.message,
          });
        }

        return res.json({
          success: true,
          message: "Login successful",
          user: {
            id: user.id,
            name: user.name,
            phoneNumber: user.phoneNumber,
            email: user.email,
            role: user.role,
            lastlogin: user.lastLogin,
            membership: user.membership,
          },
        });
      });
    }
  )(req, res, next);
});

// POST /api/auth/register
router.post("/register", validateSchema(RegisterSchema), async (req, res) => {
  try {
    const { name, phoneNumber, email, password } = req.body;

    // if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ phoneNumber }, email ? { email } : {}].filter(Boolean),
      },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User with this phone number or email already exists",
      });
    }

    // hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // create user
    const newUser = await prisma.user.create({
      data: {
        name,
        phoneNumber,
        email: email,
        password: hashedPassword,
        isActive: true,
      },
      include: {
        membership: true,
      },
    });

    const now = new Date();

    // SessionUser for login
    const user: Express.User = {
      id: newUser.id,
      name: newUser.name,
      phoneNumber: newUser.phoneNumber,
      email: newUser.email,
      role: newUser.role,
      isActive: newUser.isActive,
      lastLogin: now,
      membership: newUser.membership,
    };

    // Auto-login after registration
    req.logIn(user, (err) => {
      if (err) {
        return res.status(201).json({
          success: true,
          message: "User registered successfully, but auto-login failed",
          user,
        });
      }

      return res.status(201).json({
        success: true,
        message: "User registered and logged in successfully",
        user,
      });
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: "Registration failed",
      error: process.env.NODE_ENV === "development" ? error : undefined,
    });
  }
});

// POST /api/auth/logout
router.post("/logout", checkAuth, (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: "Logout error",
        error: err.message,
      });
    }

    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "Session destruction error",
          error: err.message,
        });
      }

      res.clearCookie("connect.sid"); // Clear session cookie
      res.json({
        success: true,
        message: "Logout successful",
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
      const { currentPassword, newPassword } = req.body;

      // Get user with password
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
      });

      if (!user || !user.password) {
        return res.status(404).json({
          success: false,
          message: "User not found or password not set",
        });
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(
        currentPassword,
        user.password
      );
      if (!isCurrentPasswordValid) {
        return res.status(401).json({
          success: false,
          message: "Current password is incorrect",
        });
      }

      // Hash new password
      const saltRounds = 12;
      const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedNewPassword },
      });

      res.json({
        success: true,
        message: "Password changed successfully",
      });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to change password",
        error: process.env.NODE_ENV === "development" ? error : undefined,
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
      const { email, password } = req.body;

      // Find user
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      if (user.password) {
        return res.status(400).json({
          success: false,
          message: "Password already set. Use change password instead.",
        });
      }

      // Hash password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Update user with password
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      });

      res.json({
        success: true,
        message: "Password set successfully. You can now login.",
      });
    } catch (error) {
      console.error("Set password error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to set password",
        error: process.env.NODE_ENV === "development" ? error : undefined,
      });
    }
  }
);

export default router;