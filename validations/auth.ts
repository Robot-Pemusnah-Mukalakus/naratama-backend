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
  phoneNumber: phoneNumber,
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: passwordReq,
});

export const SetPasswordSchema = z.object({
  email: email,
  password: passwordReq,
});

export type ChangePassword = z.infer<typeof ChangePasswordSchema>;
// ============================
// EXPORT TYPES
// ============================
export type Login = z.infer<typeof LoginSchema>;
export type Register = z.infer<typeof RegisterSchema>;
export type SetPassword = z.infer<typeof SetPasswordSchema>;
