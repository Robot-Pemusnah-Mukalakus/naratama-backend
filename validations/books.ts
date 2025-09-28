import { z } from "zod";

import { isbn } from "../utils/validation.js";

// ============================
// ENUMS
// ============================

// ============================
// USER SCHEMAS
// ============================
export const CreateBookSchema = z.object({
  author: z
    .string()
    .min(1, "Author is required")
    .max(100, "Author name too long"),
  availableQuantity: z
    .number()
    .int()
    .min(0, "Available quantity cannot be negative"),
  category: z
    .string()
    .min(1, "Category is required")
    .max(50, "Category too long"),
  coverImage: z.url("Invalid cover image URL").optional(),
  description: z.string().max(1000, "Description too long").optional(),
  genre: z
    .array(z.string().max(30, "Genre name too long"))
    .min(1, "At least one genre is required"),
  isbn: isbn,
  language: z.string().max(30, "Language name too long").optional(),
  location: z
    .string()
    .min(1, "Location is required")
    .max(50, "Location too long"),
  pages: z.number().int().min(1, "Pages must be at least 1"),
  publisher: z
    .string()
    .min(1, "Publisher is required")
    .max(100, "Publisher name too long"),
  publishYear: z
    .number()
    .int()
    .min(1800, "Invalid publish year")
    .max(new Date().getFullYear() + 1, "Future year not allowed"),
  quantity: z.number().int().min(1, "Quantity must be at least 1").optional(),
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
});

export const GetBookSchema = z.object({
  author: z.string().max(100, "Author name too long").optional(),
  available: z.boolean().optional(),
  category: z.string().max(100, "Category too long").optional(),
  limit: z.number().min(1).default(20),
  page: z.number().min(1).default(1),
  search: z.string().max(100, "Search term too long").optional(),
});

export const UpdateBookSchema = z.object({
  author: z
    .string()
    .min(1, "Author is required")
    .max(100, "Author name too long")
    .optional(),
  availableQuantity: z
    .number()
    .int()
    .min(0, "Available quantity cannot be negative")
    .optional(),
  category: z
    .string()
    .min(1, "Category is required")
    .max(50, "Category too long")
    .optional(),
  description: z.string().max(1000, "Description too long").optional(),
  genre: z
    .array(z.string().max(30, "Genre name too long"))
    .min(1, "At least one genre is required")
    .optional(),
  isActive: z.boolean().optional(),
  isbn: isbn.optional(),
  language: z.string().max(30, "Language name too long").optional(),
  location: z
    .string()
    .min(1, "Location is required")
    .max(50, "Location too long")
    .optional(),
  pages: z.number().int().min(1, "Pages must be at least 1").optional(),
  publisher: z
    .string()
    .min(1, "Publisher is required")
    .max(100, "Publisher name too long")
    .optional(),
  publishYear: z
    .number()
    .int()
    .min(1800, "Invalid publish year")
    .max(new Date().getFullYear() + 1, "Future year not allowed")
    .optional(),
  quantity: z.number().int().min(1, "Quantity must be at least 1").optional(),
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title too long")
    .optional(),
});

export const UpdateBookQuantitySchema = z
  .object({
    availableQuantity: z
      .number()
      .int()
      .min(0, "Available quantity cannot be negative"),
    quantity: z.number().int().min(1, "Quantity must be at least 1"),
  })
  .refine((data) => data.availableQuantity <= data.quantity, {
    message: "Available quantity cannot be greater than total quantity",
    path: ["availableQuantity"],
  });

// ============================
// EXPORT TYPES
// ============================
export type CreateBook = z.infer<typeof CreateBookSchema>;
export type UpdateBook = z.infer<typeof UpdateBookSchema>;
export type UpdateBookQuantity = z.infer<typeof UpdateBookQuantitySchema>;
