import { z } from "zod";

import { email, name, passwordReq, phoneNumber } from "../utils/validation.js";

// ============================
// ENUMS
// ============================
export const UserRoleSchema = z.enum(["USER", "ADMIN", "STAFF"]);

// ============================
// USER SCHEMAS
// ============================
export const CreateUserSchema = z.object({
  email: email,
  name: name,
  password: passwordReq.optional(),
  phoneNumber: phoneNumber.optional(),
  role: UserRoleSchema.optional(),
});

export const UpdateUserSchema = z.object({
  email: email.optional(),
  isActive: z.boolean().optional(),
  name: name.optional(),
  phoneNumber: phoneNumber.optional(),
  role: UserRoleSchema.optional(),
});

// ============================
// EXPORT TYPES
// ============================
export type CreateUser = z.infer<typeof CreateUserSchema>;
export type UpdateUser = z.infer<typeof UpdateUserSchema>;
