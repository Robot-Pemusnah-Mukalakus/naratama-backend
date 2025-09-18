import { z } from "zod";
import { phoneNumber, name, email, passwordReq } from "../utils/validation.js";

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
  name: name,
  phoneNumber: phoneNumber,
  email: email,
  password: passwordReq,
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: passwordReq,
});

export const SetPasswordSchema = z.object({
  email: email,
  password: passwordReq,
});

// ============================
// EXPORT TYPES
// ============================
export type Login = z.infer<typeof LoginSchema>;
export type Register = z.infer<typeof RegisterSchema>;
export type ChangePassword = z.infer<typeof ChangePasswordSchema>;
export type SetPassword = z.infer<typeof SetPasswordSchema>;
