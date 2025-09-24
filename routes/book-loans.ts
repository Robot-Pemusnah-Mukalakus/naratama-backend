import prisma from "#lib/prisma.js";
import {
  CreateBookLoanSchema,
  GetBookLoansSchema,
  UpdateBookLoanSchema,
} from "#validations/bookLoans.js";
import { LoanStatus, Prisma } from "@prisma/client";
import express from "express";

import { validateSchema } from "../middleware/validation.js";

const router = express.Router();

// GET /api/book-loans
router.get("/", validateSchema(GetBookLoansSchema), async (req, res) => {
  try {
    const { bookId, limit = 20, page = 1, status, userId } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: Prisma.BookLoanWhereInput = {};

    if (userId) where.userId = userId as string;
    if (bookId) where.bookId = bookId as string;
    if (status) where.status = status as LoanStatus;

    const [loans, total] = await Promise.all([
      prisma.bookLoan.findMany({
        include: {
          book: {
            select: { author: true, isbn: true, title: true },
          },
          user: {
            include: { membership: true },
            select: { name: true, phoneNumber: true },
          },
        },
        orderBy: { loanDate: "desc" },
        skip,
        take: limitNum,
        where,
      }),
      prisma.bookLoan.count({ where }),
    ]);

    res.json({
      count: loans.length,
      data: loans,
      page: pageNum,
      success: true,
      total,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
      message: "Failed to fetch book loans",
      success: false,
    });
  }
});

// GET /api/book-loans/overdue
router.get("/overdue", async (req, res) => {
  try {
    const today = new Date();

    const overdueLoans = await prisma.bookLoan.findMany({
      include: {
        book: {
          select: { author: true, isbn: true, title: true },
        },
        user: {
          select: { email: true, name: true, phoneNumber: true },
        },
      },
      orderBy: { dueDate: "asc" },
      where: {
        dueDate: {
          lt: today,
        },
        status: "ACTIVE",
      },
    });

    res.json({
      count: overdueLoans.length,
      data: overdueLoans,
      success: true,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
      message: "Failed to fetch overdue loans",
      success: false,
    });
  }
});

// GET /api/book-loans/:id
router.get("/:id", async (req, res) => {
  try {
    const loan = await prisma.bookLoan.findUnique({
      include: {
        book: {
          select: { author: true, isbn: true, title: true },
        },
        user: {
          select: { name: true, phoneNumber: true },
        },
      },
      where: { id: req.params.id },
    });

    if (!loan) {
      return res.status(404).json({
        message: "Book loan not found",
        success: false,
      });
    }

    res.json({
      data: loan,
      success: true,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
      message: "Failed to fetch book loan",
      success: false,
    });
  }
});

// POST /api/book-loans
router.post("/", validateSchema(CreateBookLoanSchema), async (req, res) => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { bookId, dueDate, loanDate, userId } = req.body;

    const where: Prisma.BookLoanWhereInput = {};

    if (userId) where.userId = userId as string;
    if (bookId) where.bookId = bookId as string;
    if (loanDate) where.loanDate = loanDate as Date;
    if (dueDate) where.dueDate = dueDate as Date;

    // Validate required fields
    if (!userId || !bookId) {
      return res.status(400).json({
        message: "Missing required fields",
        success: false,
      });
    }

    // check if user exists
    const user = await prisma.user.findUnique({
      include: { membership: true },
      where: { id: userId as string },
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }

    // check if book exists and is available
    const book = await prisma.book.findUnique({
      where: { id: bookId as string },
    });

    if (!book?.isActive) {
      return res.status(404).json({
        message: "Book not found",
        success: false,
      });
    }

    if (book.availableQuantity <= 0) {
      return res.status(400).json({
        message: "Book not available for loan",
        success: false,
      });
    }

    // check if user already has an active loan for this book
    const existingLoan = await prisma.bookLoan.findFirst({
      where: {
        bookId: bookId as string,
        status: "ACTIVE",
        userId: userId as string,
      },
    });

    if (existingLoan) {
      return res.status(400).json({
        message: "User already has an active loan for this book",
        success: false,
      });
    }

    const lateFeesPerDay = 5000;

    // Create the loan and update book availability in a transaction
    const result = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        // Create the loan
        const loan = await tx.bookLoan.create({
          data: {
            bookId: bookId as string,
            dueDate: where.dueDate as Date,
            lateFeesPerDay,
            loanDate: where.loanDate as Date,
            userId: userId as string,
          },
          include: {
            book: {
              select: { author: true, isbn: true, title: true },
            },
            user: {
              select: { name: true, phoneNumber: true },
            },
          },
        });

        // Update book availability
        await tx.book.update({
          data: {
            availableQuantity: book.availableQuantity - 1,
          },
          where: { id: bookId as string },
        });

        return loan;
      }
    );

    res.status(201).json({
      data: result,
      message: "Book loan created successfully",
      success: true,
    });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : "Unknown error",
      message: "Failed to create book loan",
      success: false,
    });
  }
});

// PUT /api/book-loans/:id/return
router.put(
  "/:id/return",
  validateSchema(UpdateBookLoanSchema),
  async (req, res) => {
    try {
      const { returnDate } = req.body as Prisma.BookLoanUpdateInput;

      const loan = await prisma.bookLoan.findUnique({
        include: { book: true },
        where: { id: req.params.id },
      });

      if (!loan) {
        return res.status(404).json({
          message: "Book loan not found",
          success: false,
        });
      }

      if (loan.status !== "ACTIVE") {
        return res.status(400).json({
          message: "Book loan is not active",
          success: false,
        });
      }

      const actualReturnDate = returnDate as Date;

      // Calculate late fee if overdue
      let lateFee = 0;
      if (actualReturnDate > loan.dueDate) {
        const daysLate = Math.ceil(
          (actualReturnDate.getTime() - loan.dueDate.getTime()) /
            (1000 * 60 * 60 * 24)
        );
        lateFee = daysLate * 5000;
      }

      // Update loan and book availability in a transaction
      const result = await prisma.$transaction(
        async (tx: Prisma.TransactionClient) => {
          // Update the loan
          const updatedLoan = await tx.bookLoan.update({
            data: {
              fine: lateFee,
              returnDate: actualReturnDate,
              status: "RETURNED",
            },
            include: {
              book: {
                select: { author: true, isbn: true, title: true },
              },
              user: {
                select: { name: true, phoneNumber: true },
              },
            },
            where: { id: req.params.id },
          });

          // Update book availability
          await tx.book.update({
            data: {
              availableQuantity: loan.book.availableQuantity + 1,
            },
            where: { id: loan.bookId },
          });

          return updatedLoan;
        }
      );

      res.json({
        data: result,
        message: "Book returned successfully",
        success: true,
      });
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Unknown error",
        message: "Failed to return book",
        success: false,
      });
    }
  }
);

// PUT /api/book-loans/:id/extend
router.put("/:id/extend", async (req, res) => {
  try {
    const { extensionDays = 7 } = req.body as { extensionDays?: number };

    const loan = await prisma.bookLoan.findUnique({
      where: { id: req.params.id },
    });

    if (!loan) {
      return res.status(404).json({
        message: "Book loan not found",
        success: false,
      });
    }

    if (loan.status !== "ACTIVE") {
      return res.status(400).json({
        message: "Book loan is not active",
        success: false,
      });
    }

    if (loan.renewalCount >= loan.maxRenewals) {
      return res.status(400).json({
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        message: `Maximum extensions reached (${loan.maxRenewals} times)`,
        success: false,
      });
    }

    const newDueDate = new Date(loan.dueDate);
    newDueDate.setDate(newDueDate.getDate() + extensionDays);

    const updatedLoan = await prisma.bookLoan.update({
      data: {
        dueDate: newDueDate,
        renewalCount: loan.renewalCount + 1,
      },
      include: {
        book: {
          select: { author: true, isbn: true, title: true },
        },
        user: {
          select: { name: true, phoneNumber: true },
        },
      },
      where: { id: req.params.id },
    });

    res.json({
      data: updatedLoan,
      message: "Book loan extended successfully",
      success: true,
    });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : "Unknown error",
      message: "Failed to extend book loan",
      success: false,
    });
  }
});

export default router;
