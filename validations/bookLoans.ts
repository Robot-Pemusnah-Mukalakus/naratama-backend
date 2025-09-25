import { z } from "zod";

import { mongoId } from "../utils/validation.js";

// ============================
// ENUMS
// ============================
export const LoanStatusSchema = z.enum([
  "ACTIVE",
  "RETURNED",
  "OVERDUE",
  "LOST",
]);

// ============================
// USER SCHEMAS
// ============================
export const GetBookLoansSchema = z.object({
  bookId: mongoId,
  limit: z.number().min(1).max(100).default(20).optional(),
  page: z.number().min(1).default(1).optional(),
  status: LoanStatusSchema,
  userId: mongoId,
});

export const CreateBookLoanSchema = z.object({
  bookId: mongoId,
  dueDate: z.iso.datetime().or(z.date()),
  notes: z.string().max(300, "Notes too long").optional(),
  userId: mongoId,
});

export const UpdateBookLoanSchema = z.object({
  dueDate: z.iso.datetime().or(z.date()).optional(),
  fine: z.number().min(0, "Fine cannot be negative").optional(),
  notes: z.string().max(300, "Notes too long").optional(),
  returnDate: z.iso.datetime().or(z.date()).optional(),
  status: LoanStatusSchema.optional(),
});

export const RenewBookLoanSchema = z.object({
  extensionDays: z
    .number()
    .min(1, "Extension days must be at least 1")
    .max(30, "Extension days cannot exceed 30")
    .optional(),
});

// ============================
// EXPORT TYPES
// ============================

export type CreateBookLoan = z.infer<typeof CreateBookLoanSchema>;
export type GetBookLoans = z.infer<typeof GetBookLoansSchema>;
export type RenewBookLoan = z.infer<typeof RenewBookLoanSchema>;
export type UpdateBookLoan = z.infer<typeof UpdateBookLoanSchema>;
