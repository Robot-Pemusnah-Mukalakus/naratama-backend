import { z } from "zod";

// ============================
// ENUMS
// ============================

// ============================
// USER SCHEMAS
// ============================
export const PaginationSchema = z.object({
  limit: z
    .string()
    .regex(/^\d+$/, "Limit must be a number")
    .transform(Number)
    .refine((n) => n >= 1 && n <= 100, "Limit must be between 1 and 100")
    .optional(),
  page: z
    .string()
    .regex(/^\d+$/, "Page must be a number")
    .transform(Number)
    .refine((n) => n >= 1, "Page must be at least 1")
    .optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

export const SearchSchema = z.object({
  query: z
    .string()
    .min(1, "Search query is required")
    .max(100, "Search query too long"),
});

// ID Parameter Schema
export const IdParamSchema = z.object({
  id: z.string().min(1, "ID is required"),
});

// ============================
// EXPORT TYPES
// ============================

export type IdParam = z.infer<typeof IdParamSchema>;
export type Pagination = z.infer<typeof PaginationSchema>;
export type Search = z.infer<typeof SearchSchema>;
