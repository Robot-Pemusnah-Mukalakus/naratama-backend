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
import { generateOTP, getOTPExpiry, sendOTPEmail } from "../utils/otp.js";
import {
  ChangePasswordSchema,
  LoginSchema,
  RegisterSchema,
  SetPasswordSchema,
  VerifyOTPSchema,
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
    res.redirect(`${process.env.FRONTEND_URL}/auth/success`);
  }
);

// POST /api/auth/register
router.post("/register", validateSchema(RegisterSchema), async (req, res) => {
  try {
    const { email, name, password, phoneNumber } =
      req.body as Prisma.UserCreateInput;

    // Check if user already exists and is verified
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { phoneNumber }].filter(Boolean),
      },
    });

    if (existingUser && existingUser.isEmailVerified) {
      return res.status(409).json({
        message: "User with this phone number or email already exists",
        success: false,
      });
    }

    // Generate OTP
    const otp = generateOTP();
    const otpExpiry = getOTPExpiry();

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    if (existingUser && !existingUser.isEmailVerified) {
      // Update existing unverified user with new OTP
      await prisma.user.update({
        data: {
          name,
          otp,
          otpExpiry,
          password: hashedPassword,
          phoneNumber,
        },
        where: { id: existingUser.id },
      });
    } else {
      // Create new user with OTP (not verified yet)
      await prisma.user.create({
        data: {
          email,
          isActive: false, // Inactive until verified
          isEmailVerified: false,
          name,
          otp,
          otpExpiry,
          password: hashedPassword,
          phoneNumber: phoneNumber ?? "",
        },
      });
    }

    // Send OTP email
    await sendOTPEmail(email, otp, name);

    res.status(200).json({
      message:
        "Registration initiated. Please check your email for the OTP code.",
      success: true,
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

// POST /api/auth/verify-otp
router.post(
  "/verify-otp",
  validateSchema(VerifyOTPSchema),
  async (req, res) => {
    try {
      const { email, otp } = req.body as { email: string; otp: string };

      // Find user with matching email
      const user = await prisma.user.findUnique({
        include: { membership: true },
        where: { email },
      });

      if (!user) {
        return res.status(404).json({
          message: "User not found",
          success: false,
        });
      }

      if (user.isEmailVerified) {
        return res.status(400).json({
          message: "Email already verified. Please login.",
          success: false,
        });
      }

      // Check if OTP matches
      if (user.otp !== otp) {
        return res.status(401).json({
          message: "Invalid OTP code",
          success: false,
        });
      }

      // Check if OTP is expired
      if (!user.otpExpiry || new Date() > user.otpExpiry) {
        return res.status(401).json({
          message: "OTP code has expired. Please request a new one.",
          success: false,
        });
      }

      // Update user: mark as verified and active, clear OTP
      const verifiedUser = await prisma.user.update({
        data: {
          isActive: true,
          isEmailVerified: true,
          otp: null,
          otpExpiry: null,
        },
        include: { membership: true },
        where: { id: user.id },
      });

      const now = new Date();

      const sessionUser: SessionUser = {
        email: verifiedUser.email,
        id: verifiedUser.id,
        isActive: verifiedUser.isActive,
        isEmailVerified: verifiedUser.isEmailVerified,
        isOauthUser: verifiedUser.isOauthUser,
        lastLogin: now,
        membership: verifiedUser.membership,
        name: verifiedUser.name,
        phoneNumber: verifiedUser.phoneNumber,
        role: verifiedUser.role,
      };

      // Auto-login after verification
      req.logIn(sessionUser, (err) => {
        if (err) {
          return res.status(200).json({
            message:
              "Email verified successfully, but auto-login failed. Please login.",
            success: true,
          });
        }

        return res.status(200).json({
          message: "Email verified and logged in successfully",
          success: true,
          user: sessionUser,
        });
      });
    } catch (error) {
      console.error("OTP verification error:", error);
      res.status(500).json({
        error: process.env.NODE_ENV === "development" ? error : undefined,
        message: "OTP verification failed",
        success: false,
      });
    }
  }
);

// POST /api/auth/resend-otp
router.post("/resend-otp", async (req, res) => {
  try {
    const { email } = req.body as { email: string };

    if (!email) {
      return res.status(400).json({
        message: "Email is required",
        success: false,
      });
    }

    // Find user with matching email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        message: "Email already verified. Please login.",
        success: false,
      });
    }

    // Generate new OTP
    const otp = generateOTP();
    const otpExpiry = getOTPExpiry();

    // Update user with new OTP
    await prisma.user.update({
      data: {
        otp,
        otpExpiry,
      },
      where: { id: user.id },
    });

    // Send OTP email
    await sendOTPEmail(email, otp, user.name);

    res.status(200).json({
      message: "New OTP has been sent to your email.",
      success: true,
    });
  } catch (error) {
    console.error("Resend OTP error:", error);
    res.status(500).json({
      error: process.env.NODE_ENV === "development" ? error : undefined,
      message: "Failed to resend OTP",
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
