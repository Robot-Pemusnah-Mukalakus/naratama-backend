/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Prisma } from "@prisma/client";
import express from "express";

import prisma from "../lib/prisma.js";
import { checkStaff } from "../middleware/auth.js";
import { validateMultiple, validateSchema } from "../middleware/validation.js";
import {
  CreateBookSchema,
  IdParamSchema,
  UpdateBookQuantitySchema,
  UpdateBookSchema,
} from "../validations/index.js";

const router = express.Router();

// GET /api/books
router.get("/", async (req, res) => {
  try {
    const {
      author,
      available,
      category,
      limit = 20,
      page = 1,
      search,
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: Prisma.BookWhereInput = { isActive: true };

    // Search functionality
    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: "insensitive" } },
        { author: { contains: search as string, mode: "insensitive" } },
        { isbn: { contains: search as string, mode: "insensitive" } },
      ];
    }

    // Filter by category
    if (category) {
      if (typeof category === "string") {
        where.category = category;
      } else if (Array.isArray(category) && typeof category[0] === "string") {
        where.category = category[0];
      }
    }

    // Filter by author
    if (author)
      where.author = { contains: author as string, mode: "insensitive" };

    // Filter by availability
    if (available === "true") where.availableQuantity = { gt: 0 };

    const [books, total] = await Promise.all([
      prisma.book.findMany({
        orderBy: { addedDate: "desc" },
        skip,
        take: limitNum,
        where,
      }),
      prisma.book.count({ where }),
    ]);

    res.json({
      count: books.length,
      data: books,
      page: pageNum,
      success: true,
      total,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
      message: "Failed to fetch books",
      success: false,
    });
  }
});

// GET /api/books/categories
router.get("/categories", async (req, res) => {
  try {
    const categories = await prisma.book.findMany({
      distinct: ["category"],
      select: { category: true },
      where: { isActive: true },
    });

    const categoryList = categories.map(
      (book: { category: string }) => book.category
    );

    res.json({
      data: categoryList,
      success: true,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
      message: "Failed to fetch categories",
      success: false,
    });
  }
});

// GET /api/books/new
router.get("/new", async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const limitNum = parseInt(limit as string);

    const books = await prisma.book.findMany({
      orderBy: { addedDate: "desc" },
      take: limitNum,
      where: { isActive: true },
    });

    res.json({
      count: books.length,
      data: books,
      success: true,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
      message: "Failed to fetch new books",
      success: false,
    });
  }
});

// GET /api/books/:id
router.get(
  "/:id",
  validateSchema(IdParamSchema, "params"),
  async (req, res) => {
    try {
      const book = await prisma.book.findUnique({
        where: { id: req.params.id },
      });

      if (!book?.isActive) {
        return res.status(404).json({
          message: "Book not found",
          success: false,
        });
      }

      res.json({
        data: book,
        success: true,
      });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "Unknown error",
        message: "Failed to fetch book",
        success: false,
      });
    }
  }
);

// POST /api/books
router.post(
  "/",
  checkStaff,
  validateSchema(CreateBookSchema),
  async (req, res) => {
    try {
      const {
        author,
        category,
        coverImage,
        description,
        genre = [],
        isbn,
        language = "Indonesian",
        location,
        pages,
        publisher,
        publishYear,
        quantity,
        title,
      } = req.body as Prisma.BookCreateInput;

      // check if ISBN already exists
      const existingBook = await prisma.book.findUnique({
        where: { isbn },
      });

      if (existingBook) {
        return res.status(400).json({
          message: "ISBN already exists",
          success: false,
        });
      }

      const book = await prisma.book.create({
        data: {
          author,
          availableQuantity: quantity ?? 0,
          category,
          coverImage: typeof coverImage === "string" ? coverImage : "",
          description,
          genre,
          isbn,
          language,
          location,
          pages,
          publisher,
          publishYear,
          quantity,
          title,
        },
      });

      res.status(201).json({
        data: book,
        message: "Book added successfully",
        success: true,
      });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("Unique constraint")
      ) {
        return res.status(400).json({
          message: "ISBN already exists",
          success: false,
        });
      }

      res.status(400).json({
        error: error instanceof Error ? error.message : "Unknown error",
        message: "Failed to add book",
        success: false,
      });
    }
  }
);

// PUT /api/books/:id
router.put(
  "/:id",
  validateMultiple({
    body: UpdateBookSchema,
    params: IdParamSchema,
  }),
  async (req, res) => {
    try {
      const updateData: Prisma.BookUpdateInput = {};

      const allowedFields: (keyof Prisma.BookUpdateInput)[] = [
        "author",
        "category",
        "coverImage",
        "description",
        "genre",
        "isbn",
        "language",
        "location",
        "pages",
        "publisher",
        "publishYear",
        "quantity",
        "availableQuantity",
        "title",
      ];

      // only include allowed fields in update
      allowedFields.forEach((field) => {
        const value = (req.body as any)[field];

        if (value !== undefined && value !== null) {
          (updateData as any)[field] = value;
        }
      });

      const book = await prisma.book.update({
        data: updateData,
        where: { id: req.params.id },
      });

      res.json({
        data: book,
        message: "Book updated successfully",
        success: true,
      });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("Record to update not found")
      ) {
        return res.status(404).json({
          message: "Book not found",
          success: false,
        });
      }

      res.status(400).json({
        error: error instanceof Error ? error.message : "Unknown error",
        message: "Failed to update book",
        success: false,
      });
    }
  }
);

// PUT /api/books/:id/quantity
router.put(
  "/:id/quantity",
  validateMultiple({
    body: UpdateBookQuantitySchema,
    params: IdParamSchema,
  }),
  async (req, res) => {
    try {
      const { availableQuantity, quantity } =
        req.body as Prisma.BookUpdateInput;

      const book = await prisma.book.update({
        data: { availableQuantity, quantity },
        where: { id: req.params.id },
      });

      res.json({
        data: book,
        message: "Book quantity updated successfully",
        success: true,
      });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("Record to update not found")
      ) {
        return res.status(404).json({
          message: "Book not found",
          success: false,
        });
      }

      res.status(400).json({
        error: error instanceof Error ? error.message : "Unknown error",
        message: "Failed to update book quantity",
        success: false,
      });
    }
  }
);

// DELETE /api/books/:id
router.delete(
  "/:id",
  validateSchema(IdParamSchema, "params"),
  async (req, res) => {
    try {
      await prisma.book.update({
        data: { isActive: false },
        where: { id: req.params.id },
      });

      res.json({
        message: "Book removed successfully",
        success: true,
      });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("Record to update not found")
      ) {
        return res.status(404).json({
          message: "Book not found",
          success: false,
        });
      }

      res.status(500).json({
        error: error instanceof Error ? error.message : "Unknown error",
        message: "Failed to remove book",
        success: false,
      });
    }
  }
);

export default router;
