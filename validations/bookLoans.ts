import { z } from "zod";

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
export const CreateBookLoanSchema = z.object({
  bookId: z.string().min(1, "Book ID is required"),
  dueDate: z.iso.datetime().or(z.date()),
  notes: z.string().max(300, "Notes too long").optional(),
  userId: z.string().min(1, "User ID is required"),
});

export const UpdateBookLoanSchema = z.object({
  dueDate: z.iso.datetime().or(z.date()).optional(),
  fine: z.number().min(0, "Fine cannot be negative").optional(),
  notes: z.string().max(300, "Notes too long").optional(),
  returnDate: z.iso.datetime().or(z.date()).optional(),
  status: LoanStatusSchema.optional(),
});

export const RenewBookLoanSchema = z.object({
  loanId: z.string().min(1, "Loan ID is required"),
});

// ============================
// EXPORT TYPES
// ============================
export type CreateBookLoan = z.infer<typeof CreateBookLoanSchema>;
export type RenewBookLoan = z.infer<typeof RenewBookLoanSchema>;
export type UpdateBookLoan = z.infer<typeof UpdateBookLoanSchema>;
