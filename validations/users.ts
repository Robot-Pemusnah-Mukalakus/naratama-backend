import { z } from "zod";
import { phoneNumber, name, email } from "../utils/validation.ts";

// ============================
// ENUMS
// ============================
export const UserRoleSchema = z.enum(["USER", "ADMIN", "STAFF"]);

// ============================
// USER SCHEMAS
// ============================
export const CreateUserSchema = z.object({
  name: name,
  phoneNumber: phoneNumber,
  email: email,
  password: z
    .string()
    .min(6, "Hashed Password must be at least 6 characters")
    .optional(),
  role: UserRoleSchema.optional(),
});

export const UpdateUserSchema = z.object({
  name: name.optional(),
  phoneNumber: phoneNumber.optional(),
  email: email.optional(),
  role: UserRoleSchema.optional(),
  isActive: z.boolean().optional(),
});

// ============================
// EXPORT TYPES
// ============================
export type CreateUser = z.infer<typeof CreateUserSchema>;
export type UpdateUser = z.infer<typeof UpdateUserSchema>;
