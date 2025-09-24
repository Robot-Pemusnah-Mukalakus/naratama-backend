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
  bookId: mongoId.optional(),
  limit: z.number().min(1).max(100).default(20).optional(),
  page: z.number().min(1).default(1).optional(),
  status: LoanStatusSchema.optional(),
  userId: mongoId.optional(),
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
  loanId: mongoId,
});

// ============================
// EXPORT TYPES
// ============================
export type CreateBookLoan = z.infer<typeof CreateBookLoanSchema>;
export type RenewBookLoan = z.infer<typeof RenewBookLoanSchema>;
export type UpdateBookLoan = z.infer<typeof UpdateBookLoanSchema>;
