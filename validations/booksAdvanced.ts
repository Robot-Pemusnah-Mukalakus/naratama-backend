import { z } from "zod";

// ============================
// ENUMS
// ============================

// ============================
// USER SCHEMAS
// ============================
export const BookSearchSchema = z
  .object({
    author: z.string().optional(),
    available: z.enum(["true", "false"]).optional(),
    category: z.string().optional(),
    maxYear: z
      .string()
      .regex(/^\d{4}$/)
      .transform(Number)
      .optional(),
    minYear: z
      .string()
      .regex(/^\d{4}$/)
      .transform(Number)
      .optional(),
    q: z.string().optional(),
    sortBy: z.enum(["title", "author", "addedDate", "publishYear"]).optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
  })
  .refine(
    (data) => {
      if (data.minYear && data.maxYear) {
        return data.minYear <= data.maxYear;
      }
      return true;
    },
    {
      message: "minYear must be less than or equal to maxYear",
      path: ["maxYear"],
    }
  );

// ============================
// EXPORT TYPES
// ============================

export type BookSearch = z.infer<typeof BookSearchSchema>;
