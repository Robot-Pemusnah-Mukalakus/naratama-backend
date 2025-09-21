import { z } from "zod";

import { email, name, phoneNumber } from "../utils/validation.js";

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
  password: z
    .string()
    .min(6, "Hashed Password must be at least 6 characters")
    .optional(),
  phoneNumber: phoneNumber,
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
