import { z } from "zod";

import { membershipNumber, mongoId } from "../utils/validation.js";

// ============================
// ENUMS
// ============================

// ============================
// USER SCHEMAS
// ============================
export const CreateMembershipSchema = z.object({
  endDate: z.iso.datetime().or(z.date()),
  membershipNumber: membershipNumber,
  startDate: z.iso.datetime().or(z.date()).optional(),
  userId: mongoId,
});

export const UpdateMembershipSchema = z.object({
  endDate: z.iso.datetime().or(z.date()).optional(),
  isActive: z.boolean().optional(),
  membershipNumber: membershipNumber.optional(),
  startDate: z.iso.datetime().or(z.date()).optional(),
});

// ============================
// EXPORT TYPES
// ============================
export type CreateMembership = z.infer<typeof CreateMembershipSchema>;
export type UpdateMembership = z.infer<typeof UpdateMembershipSchema>;
