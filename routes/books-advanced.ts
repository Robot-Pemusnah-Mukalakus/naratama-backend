import express from "express";
import { z } from "zod";
import prisma from "../lib/prisma.js";
import {
  validateSchema,
  validateMultiple,
  validateData,
} from "../middleware/validation.js";
import {
  CreateBookSchema,
  UpdateBookSchema,
  IdParamSchema,
  PaginationSchema,
} from "../validations/index.js";
import {
  createSearchFilter,
  createPaginationQuery,
} from "../utils/validation.js";

const router = express.Router();

// Advanced search schema with filters
const BookSearchSchema = z
  .object({
    q: z.string().optional(),
    category: z.string().optional(),
    author: z.string().optional(),
    available: z.enum(["true", "false"]).optional(),
    minYear: z
      .string()
      .regex(/^\d{4}$/)
      .transform(Number)
      .optional(),
    maxYear: z
      .string()
      .regex(/^\d{4}$/)
      .transform(Number)
      .optional(),
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

// Combined query and pagination validation example
router.get(
  "/search",
  validateMultiple({
    query: BookSearchSchema.merge(PaginationSchema),
  }),
  async (req, res) => {
    try {
      const {
        q,
        category,
        author,
        available,
        minYear,
        maxYear,
        page = 1,
        limit = 20,
        sortBy = "addedDate",
        sortOrder = "desc",
      } = req.query as any;

      // Build where clause
      const where: any = { isActive: true };

      // Search functionality
      if (q) {
        where.AND = [
          createSearchFilter(q, ["title", "author", "isbn", "description"]),
        ];
      }

      // Category filter
      if (category) {
        where.category = category;
      }

      // Author filter
      if (author) {
        where.author = { contains: author, mode: "insensitive" };
      }

      // Availability filter
      if (available) {
        if (available === "true") {
          where.availableQuantity = { gt: 0 };
        } else {
          where.availableQuantity = { lte: 0 };
        }
      }

      // Year range filter
      if (minYear || maxYear) {
        where.publishYear = {};
        if (minYear) where.publishYear.gte = minYear;
        if (maxYear) where.publishYear.lte = maxYear;
      }

      const { skip, take } = createPaginationQuery(page, limit);

      const [books, total] = await Promise.all([
        prisma.book.findMany({
          where,
          orderBy: { [sortBy]: sortOrder },
          skip,
          take,
        }),
        prisma.book.count({ where }),
      ]);

      res.json({
        success: true,
        count: books.length,
        total,
        page,
        totalPages: Math.ceil(total / limit),
        filters: {
          query: q,
          category,
          author,
          available,
          yearRange:
            minYear || maxYear ? { min: minYear, max: maxYear } : undefined,
        },
        data: books,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Search failed",
        error: process.env.NODE_ENV === "development" ? error : undefined,
      });
    }
  }
);

// Example of manual validation in route handler
router.post("/bulk-create", async (req, res) => {
  try {
    const { books } = req.body;

    if (!Array.isArray(books)) {
      return res.status(400).json({
        success: false,
        message: "Books must be an array",
      });
    }

    const validationErrors: Array<{ index: number; errors: any[] }> = [];
    const validBooks: any[] = [];

    // Validate each book individually
    for (let i = 0; i < books.length; i++) {
      const validation = validateData(CreateBookSchema, books[i]);
      if (validation.success) {
        validBooks.push(validation.data);
      } else {
        validationErrors.push({
          index: i,
          errors: validation.errors,
        });
      }
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation errors in bulk create",
        errors: validationErrors,
      });
    }

    // Check for duplicate ISBNs in the batch
    const isbns = validBooks.map((book) => book.isbn);
    const duplicateISBNs = isbns.filter(
      (isbn, index) => isbns.indexOf(isbn) !== index
    );

    if (duplicateISBNs.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Duplicate ISBNs found in batch",
        duplicates: duplicateISBNs,
      });
    }

    // Check for existing ISBNs in database
    const existingBooks = await prisma.book.findMany({
      where: { isbn: { in: isbns } },
      select: { isbn: true },
    });

    if (existingBooks.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Some ISBNs already exist in database",
        existingISBNs: existingBooks.map((book) => book.isbn),
      });
    }

    // Create books with available quantity equal to quantity
    const booksToCreate = validBooks.map((book) => ({
      ...book,
      availableQuantity: book.quantity,
    }));

    const createdBooks = await prisma.book.createMany({
      data: booksToCreate,
    });

    res.status(201).json({
      success: true,
      message: `Successfully created ${createdBooks.count} books`,
      count: createdBooks.count,
    });
  } catch (error) {
    console.error("Bulk create error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create books",
      error: process.env.NODE_ENV === "development" ? error : undefined,
    });
  }
});

// Example of conditional validation based on user role
const AdminUpdateBookSchema = UpdateBookSchema.extend({
  isActive: z.boolean().optional(),
  quantity: z.number().int().min(0).optional(),
  availableQuantity: z.number().int().min(0).optional(),
});

router.put(
  "/:id/admin",
  validateMultiple({
    params: IdParamSchema,
    body: AdminUpdateBookSchema,
  }),
  async (req, res) => {
    try {
      // In a real app, you'd check user permissions here
      // For example: checkAdmin middleware

      const book = await prisma.book.update({
        where: { id: req.params.id },
        data: req.body,
      });

      res.json({
        success: true,
        message: "Book updated by admin",
        data: book,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: "Failed to update book",
        error: process.env.NODE_ENV === "development" ? error : undefined,
      });
    }
  }
);

export default router;
