import { z } from "zod";

import { email, name, passwordReq, phoneNumber } from "../utils/validation.js";

// ============================
// ENUMS
// ============================

// ============================
// AUTH SCHEMAS
// ============================
export const LoginSchema = z.object({
  email: email,
  password: z.string().min(1, "Password is required"),
});

export const RegisterSchema = z.object({
  email: email,
  name: name,
  password: passwordReq,
  phoneNumber: phoneNumber.optional(),
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: passwordReq,
});

export const SetPasswordSchema = z.object({
  email: email,
  password: passwordReq,
});

export const VerifyOTPSchema = z.object({
  email: email,
  otp: z
    .string()
    .length(6, "OTP must be 6 digits")
    .regex(/^\d+$/, "OTP must contain only numbers"),
});

// ============================
// EXPORT TYPES
// ============================
export type ChangePassword = z.infer<typeof ChangePasswordSchema>;
export type Login = z.infer<typeof LoginSchema>;
export type Register = z.infer<typeof RegisterSchema>;
export type SetPassword = z.infer<typeof SetPasswordSchema>;
export type VerifyOTP = z.infer<typeof VerifyOTPSchema>;
