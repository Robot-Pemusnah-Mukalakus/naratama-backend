import express from "express";
import prisma from "../lib/prisma.js";

const router = express.Router();

// GET /api/book-loans
router.get("/", async (req, res) => {
  try {
    const { userId, bookId, status, page = 1, limit = 20 } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (userId) where.userId = userId;
    if (bookId) where.bookId = bookId;
    if (status) where.status = status;

    const [loans, total] = await Promise.all([
      prisma.bookLoan.findMany({
        where,
        include: {
          user: {
            select: { name: true, phoneNumber: true },
            include: { membership: true },
          },
          book: {
            select: { title: true, author: true, isbn: true },
          },
        },
        orderBy: { loanDate: "desc" },
        skip,
        take: limitNum,
      }),
      prisma.bookLoan.count({ where }),
    ]);

    res.json({
      success: true,
      count: loans.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      data: loans,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch book loans",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// GET /api/book-loans/overdue
router.get("/overdue", async (req, res) => {
  try {
    const today = new Date();

    const overdueLoans = await prisma.bookLoan.findMany({
      where: {
        dueDate: {
          lt: today,
        },
        status: "ACTIVE",
      },
      include: {
        user: {
          select: { name: true, phoneNumber: true },
        },
        book: {
          select: { title: true, author: true, isbn: true },
        },
      },
      orderBy: { dueDate: "asc" },
    });

    res.json({
      success: true,
      count: overdueLoans.length,
      data: overdueLoans,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch overdue loans",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// GET /api/book-loans/:id
router.get("/:id", async (req, res) => {
  try {
    const loan = await prisma.bookLoan.findUnique({
      where: { id: req.params.id },
      include: {
        user: {
          select: { name: true, phoneNumber: true },
        },
        book: {
          select: { title: true, author: true, isbn: true },
        },
      },
    });

    if (!loan) {
      return res.status(404).json({
        success: false,
        message: "Book loan not found",
      });
    }

    res.json({
      success: true,
      data: loan,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch book loan",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// POST /api/book-loans
router.post("/", async (req, res) => {
  try {
    const { userId, bookId, loanDays = 7 } = req.body;

    // Validate required fields
    if (!userId || !bookId) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    // check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { membership: true },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // check if book exists and is available
    const book = await prisma.book.findUnique({
      where: { id: bookId },
    });

    if (!book || !book.isActive) {
      return res.status(404).json({
        success: false,
        message: "Book not found",
      });
    }

    if (book.availableQuantity <= 0) {
      return res.status(400).json({
        success: false,
        message: "Book not available for loan",
      });
    }

    // check if user already has an active loan for this book
    const existingLoan = await prisma.bookLoan.findFirst({
      where: {
        userId,
        bookId,
        status: "ACTIVE",
      },
    });

    if (existingLoan) {
      return res.status(400).json({
        success: false,
        message: "User already has an active loan for this book",
      });
    }

    const loanDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + loanDays);

    // Calculate fees based on membership status
    // Check if user has active membership
    const now = new Date();
    const hasActiveMembership =
      user.membership &&
      user.membership.isActive &&
      user.membership.endDate > now;

    const lateFeesPerDay = 5000;

    // Create the loan and update book availability in a transaction
    const result = await prisma.$transaction(async (tx: any) => {
      // Create the loan
      const loan = await tx.bookLoan.create({
        data: {
          userId,
          bookId,
          loanDate,
          dueDate,
          lateFeesPerDay,
        },
        include: {
          user: {
            select: { name: true, phoneNumber: true },
          },
          book: {
            select: { title: true, author: true, isbn: true },
          },
        },
      });

      // Update book availability
      await tx.book.update({
        where: { id: bookId },
        data: {
          availableQuantity: book.availableQuantity - 1,
        },
      });

      return loan;
    });

    res.status(201).json({
      success: true,
      message: "Book loan created successfully",
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Failed to create book loan",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// PUT /api/book-loans/:id/return
router.put("/:id/return", async (req, res) => {
  try {
    const { returnDate } = req.body;

    const loan = await prisma.bookLoan.findUnique({
      where: { id: req.params.id },
      include: { book: true },
    });

    if (!loan) {
      return res.status(404).json({
        success: false,
        message: "Book loan not found",
      });
    }

    if (loan.status !== "ACTIVE") {
      return res.status(400).json({
        success: false,
        message: "Book loan is not active",
      });
    }

    const actualReturnDate = returnDate ? new Date(returnDate) : new Date();

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
    const result = await prisma.$transaction(async (tx: any) => {
      // Update the loan
      const updatedLoan = await tx.bookLoan.update({
        where: { id: req.params.id },
        data: {
          status: "returned",
          returnDate: actualReturnDate,
          lateFee,
        },
        include: {
          user: {
            select: { name: true, phoneNumber: true },
          },
          book: {
            select: { title: true, author: true, isbn: true },
          },
        },
      });

      // Update book availability
      await tx.book.update({
        where: { id: loan.bookId },
        data: {
          availableQuantity: loan.book.availableQuantity + 1,
        },
      });

      return updatedLoan;
    });

    res.json({
      success: true,
      message: "Book returned successfully",
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Failed to return book",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// PUT /api/book-loans/:id/extend
router.put("/:id/extend", async (req, res) => {
  try {
    const { extensionDays = 7 } = req.body;

    const loan = await prisma.bookLoan.findUnique({
      where: { id: req.params.id },
    });

    if (!loan) {
      return res.status(404).json({
        success: false,
        message: "Book loan not found",
      });
    }

    if (loan.status !== "ACTIVE") {
      return res.status(400).json({
        success: false,
        message: "Book loan is not active",
      });
    }

    if (loan.renewalCount >= loan.maxRenewals) {
      return res.status(400).json({
        success: false,
        message: `Maximum extensions reached (${loan.maxRenewals} times)`,
      });
    }

    const newDueDate = new Date(loan.dueDate);
    newDueDate.setDate(newDueDate.getDate() + extensionDays);

    const updatedLoan = await prisma.bookLoan.update({
      where: { id: req.params.id },
      data: {
        dueDate: newDueDate,
        renewalCount: loan.renewalCount + 1,
      },
      include: {
        user: {
          select: { name: true, phoneNumber: true },
        },
        book: {
          select: { title: true, author: true, isbn: true },
        },
      },
    });

    res.json({
      success: true,
      message: "Book loan extended successfully",
      data: updatedLoan,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Failed to extend book loan",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
