import { z } from "zod";

// phone number pattern: starts with + followed by 10 to 15 digits
export const phoneNumberPattern = /^[+][0-9]{10,15}$/;

// ISBN-10 or ISBN-13 validation pattern
export const isbnPattern =
  /^(?:ISBN(?:-1[03])?:? )?(?=[0-9X]{10}$|(?=(?:[0-9]+[- ]){3})[- 0-9X]{13}$|97[89][0-9]{10}$|(?=(?:[0-9]+[- ]){4})[- 0-9]{17}$)(?:97[89][- ]?)?[0-9]{1,5}[- ]?[0-9]+[- ]?[0-9]+[- ]?[0-9X]$/;

// pass: 8 characters, at least 1 uppercase, 1 lowercase, 1 number and 1 special character
export const passwordRequirement =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s_]|.*_).{8,64}$/;

// membership code pattern: mbr-XXXX (X: uppercase letter or digit)
export const membershipCode = /^mbr-[A-Z0-9]+$/;

export const phoneNumber = z
  .string()
  .regex(
    phoneNumberPattern,
    "Invalid phone number format, use +<countrycode><number> (e.g., +1234567890)"
  );

export const name = z
  .string()
  .min(1, "Name is required")
  .max(100, "Name too long");

export const email = z.email("Invalid email format");

export const membershipNumber = z
  .string()
  .regex(membershipCode, "Invalid membership number format, use mbr-XXXX");

export const isbn = z.string().regex(isbnPattern, "Invalid ISBN format");

export const passwordReq = z
  .string()
  .regex(
    passwordRequirement,
    "Password must be at least 8 characters, include uppercase, lowercase, number and special character"
  );

export const mongoId = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid ID format");

export const dateInFuture = z
  .date()
  .refine((date) => date > new Date(), "Date must be in the future");

export const dateInNowOrPast = z
  .date()
  .refine((date) => date <= new Date(), "Date must be now or in the past");

// Custom transformations
export const stringToNumber = z.string().transform((val) => {
  const num = parseFloat(val);
  if (isNaN(num)) throw new Error("Invalid number");
  return num;
});

export const stringToBoolean = z.string().transform((val) => {
  if (val.toLowerCase() === "true") return true;
  if (val.toLowerCase() === "false") return false;
  throw new Error("Invalid boolean value");
});

// Common response schemas
export const SuccessResponseSchema = z.object({
  data: z.any().optional(),
  message: z.string().optional(),
  success: z.literal(true),
});

export const ErrorResponseSchema = z.object({
  error: z.any().optional(),
  errors: z
    .array(
      z.object({
        code: z.string(),
        field: z.string(),
        message: z.string(),
      })
    )
    .optional(),
  message: z.string(),
  success: z.literal(false),
});

export const PaginatedResponseSchema = z.object({
  count: z.number(),
  data: z.array(z.any()),
  page: z.number(),
  success: z.literal(true),
  total: z.number(),
  totalPages: z.number(),
});

// Utility functions
export const createPaginationQuery = (page = 1, limit = 20) => ({
  skip: (page - 1) * limit,
  take: limit,
});

// Search and filter helpers
export const createSearchFilter = (searchTerm: string, fields: string[]) => {
  return {
    OR: fields.map((field) => ({
      [field]: {
        contains: searchTerm,
        mode: "insensitive" as const,
      },
    })),
  };
};

// File validation
export const fileUploadSchema = z.object({
  filename: z.string().min(1, "Filename is required"),
  mimetype: z
    .string()
    .regex(/^(image|application|text)\//, "Invalid file type"),
  size: z.number().max(10 * 1024 * 1024, "File size too large (max 10MB)"),
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
export type FileUpload = z.infer<typeof fileUploadSchema>;
export type PaginatedResponse = z.infer<typeof PaginatedResponseSchema>;
export type SuccessResponse = z.infer<typeof SuccessResponseSchema>;
