import { Prisma } from "@prisma/client";
import express from "express";

import prisma from "../lib/prisma.js";
import { validateMultiple } from "../middleware/validation.js";
import {
  createPaginationQuery,
  createSearchFilter,
} from "../utils/validation.js";
import { BookSearchSchema, PaginationSchema } from "../validations/index.js";

const router = express.Router();

router.get(
  "/search",
  validateMultiple({
    query: BookSearchSchema.safeExtend(Object.assign({}, PaginationSchema)),
  }),
  async (req, res) => {
    try {
      const {
        author,
        available,
        category,
        limit = 20,
        maxYear,
        minYear,
        page = 1,
        q,
        sortBy = "addedDate",
        sortOrder = "desc",
      } = req.query;

      // Build where clause
      const where: Prisma.BookWhereInput = { isActive: true };

      // Search functionality
      if (q) {
        where.AND = [
          createSearchFilter(q as string, [
            "title",
            "author",
            "isbn",
            "description",
          ]),
        ];
      }

      // Category filter
      if (category) {
        where.category = category as string;
      }

      // Author filter
      if (author) {
        where.author = { contains: author as string, mode: "insensitive" };
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
        if (minYear) where.publishYear.gte = Number(minYear);
        if (maxYear) where.publishYear.lte = Number(maxYear);
      }

      const { skip, take } = createPaginationQuery(Number(page), Number(limit));

      const [books, total] = await Promise.all([
        prisma.book.findMany({
          orderBy: { [sortBy as string]: sortOrder },
          skip,
          take,
          where,
        }),
        prisma.book.count({ where }),
      ]);

      res.json({
        count: books.length,
        data: books,
        filters: {
          author,
          available,
          category,
          query: q,
          yearRange:
            minYear || maxYear ? { max: maxYear, min: minYear } : undefined,
        },
        page,
        success: true,
        total,
        totalPages: Math.ceil(total / Number(limit)),
      });
    } catch (error) {
      res.status(500).json({
        error: process.env.NODE_ENV === "development" ? error : undefined,
        message: "Search failed",
        success: false,
      });
    }
  }
);

export default router;
