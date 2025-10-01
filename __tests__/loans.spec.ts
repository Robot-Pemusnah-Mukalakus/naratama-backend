/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { LoanStatus, UserRole } from "@prisma/client";
import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, MockedFunction, vi } from "vitest";

const checkStaffOrAdminMock = vi.fn();

vi.mock("#middleware/auth.js", () => ({
  checkStaffOrAdmin: (req: any, res: any, next: any) => {
    checkStaffOrAdminMock(req, res, next);
  },
}));

vi.mock("../middleware/validation.js", () => ({
  validateMultiple: () => (_req: any, _res: any, next: any) => {
    next();
  },
  validateSchema: () => (_req: any, _res: any, next: any) => {
    next();
  },
}));

vi.mock("#lib/prisma.js", () => ({
  default: {
    $transaction: vi.fn(),
    book: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    bookLoan: {
      count: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

const prismaModule = await import("#lib/prisma.js");
const prisma = prismaModule.default;

const bookLoansRouterModule = await import("../routes/book-loans.js");
const bookLoansRouter = bookLoansRouterModule.default;

const mockPrismaBookLoan = prisma.bookLoan as unknown as {
  count: MockedFunction<any>;
  findFirst: MockedFunction<any>;
  findMany: MockedFunction<any>;
  findUnique: MockedFunction<any>;
  update: MockedFunction<any>;
};

const mockPrismaUser = prisma.user as unknown as {
  findUnique: MockedFunction<any>;
};

const mockPrismaBook = prisma.book as unknown as {
  findUnique: MockedFunction<any>;
  update: MockedFunction<any>;
};

const mockTransaction = prisma.$transaction as unknown as MockedFunction<any>;

const SAMPLE_USER_ID = "507f1f77bcf86cd799439011";
const SAMPLE_BOOK_ID = "507f1f77bcf86cd799439012";

const sampleUserRecord = {
  email: "jane@example.com",
  id: SAMPLE_USER_ID,
  membership: {
    id: "membership-1",
    isActive: true,
    membershipNumber: "mbr-ABCD",
  },
  name: "Jane Doe",
  phoneNumber: "+621234567890",
};

const sampleBookRecord = {
  availableQuantity: 3,
  id: SAMPLE_BOOK_ID,
  isActive: true,
};

interface LoanResponse {
  book: {
    author: string;
    isbn: string;
    title: string;
  };
  bookId: string;
  dueDate: Date;
  fine: number;
  id: string;
  lateFeesPerDay: number;
  loanDate: Date;
  maxRenewals: number;
  notes: null | string;
  renewalCount: number;
  returnDate: Date | null;
  status: LoanStatus;
  user: {
    email: string;
    membership: null;
    name: string;
    phoneNumber: string;
  };
  userId: string;
}

function buildLoan(overrides: Partial<LoanResponse> = {}): LoanResponse {
  const defaults = {
    book: {
      author: "Author Name",
      isbn: "9783161484100",
      title: "Sample Book",
    },
    bookId: SAMPLE_BOOK_ID,
    dueDate: new Date("2024-05-08T00:00:00.000Z"),
    fine: 0,
    id: "loan-1",
    lateFeesPerDay: 5000,
    loanDate: new Date("2024-05-01T00:00:00.000Z"),
    maxRenewals: 2,
    notes: null,
    renewalCount: 0,
    returnDate: null,
    status: LoanStatus.ACTIVE,
    user: {
      email: "jane@example.com",
      membership: null,
      name: "Jane Doe",
      phoneNumber: "+621234567890",
    },
    userId: SAMPLE_USER_ID,
  } satisfies LoanResponse;

  return {
    ...defaults,
    ...overrides,
    book: {
      ...defaults.book,
      ...(overrides.book ?? {}),
    },
    user: {
      ...defaults.user,
      ...(overrides.user ?? {}),
    },
  };
}

const dateFields = ["dueDate", "loanDate", "returnDate"];

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    if (req.body && typeof req.body === "object") {
      for (const field of dateFields) {
        const value = req.body[field];
        if (typeof value === "string") {
          const parsed = new Date(value);
          if (!Number.isNaN(parsed.getTime())) {
            req.body[field] = parsed;
          }
        }
      }
    }
    next();
  });
  app.use("/book-loans", bookLoansRouter);
  return app;
};

describe("Book Loans Routes", () => {
  let app: express.Application;
  let lastTransactionClient: {
    book: { update: MockedFunction<any> };
    bookLoan: { create: MockedFunction<any>; update: MockedFunction<any> };
  };

  beforeEach(() => {
    vi.clearAllMocks();

    checkStaffOrAdminMock.mockImplementation(
      (req: any, res: any, next: any) => {
        const roleHeader = req.headers["x-test-role"] as undefined | UserRole;

        req.isAuthenticated = (() =>
          Boolean(roleHeader)) as typeof req.isAuthenticated;

        if (!roleHeader) {
          res.status(401).json({
            message: "Authentication required",
            success: false,
          });
          return;
        }

        if (roleHeader !== UserRole.STAFF && roleHeader !== UserRole.ADMIN) {
          res.status(403).json({
            message: "Staff or Admin access required",
            success: false,
          });
          return;
        }

        req.user = { id: "test-user", role: roleHeader };
        next();
      }
    );

    mockPrismaBookLoan.findMany.mockResolvedValue([]);
    mockPrismaBookLoan.count.mockResolvedValue(0);
    mockPrismaBookLoan.findUnique.mockResolvedValue(null);
    mockPrismaBookLoan.findFirst.mockResolvedValue(null);
    mockPrismaBookLoan.update.mockResolvedValue(buildLoan());

    mockPrismaUser.findUnique.mockResolvedValue(sampleUserRecord);
    mockPrismaBook.findUnique.mockResolvedValue(sampleBookRecord);
    mockPrismaBook.update.mockResolvedValue(sampleBookRecord);

    lastTransactionClient = {
      book: {
        update: vi.fn().mockResolvedValue(sampleBookRecord),
      },
      bookLoan: {
        create: vi.fn().mockResolvedValue(buildLoan()),
        update: vi.fn().mockResolvedValue(
          buildLoan({
            fine: 0,
            returnDate: new Date("2024-05-05T00:00:00.000Z"),
            status: LoanStatus.RETURNED,
          })
        ),
      },
    };

    mockTransaction.mockImplementation(async (callback: any) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return await callback(lastTransactionClient);
    });

    app = createApp();
  });

  const staffHeaders = () => ({ "x-test-role": UserRole.STAFF });

  describe("GET /book-loans", () => {
    it("returns paginated loans with filters", async () => {
      const loans = [
        buildLoan({ id: "loan-1" }),
        buildLoan({ id: "loan-2", userId: SAMPLE_USER_ID }),
      ];

      mockPrismaBookLoan.findMany.mockResolvedValueOnce(loans);
      mockPrismaBookLoan.count.mockResolvedValueOnce(loans.length);

      const response = await request(app).get("/book-loans").query({
        bookId: SAMPLE_BOOK_ID,
        status: LoanStatus.ACTIVE,
        userId: SAMPLE_USER_ID,
      });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        count: loans.length,
        data: loans,
        page: 1,
        success: true,
        total: loans.length,
        totalPages: 1,
      });
      expect(mockPrismaBookLoan.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { loanDate: "desc" },
          skip: 0,
          take: 20,
          where: expect.objectContaining({
            bookId: SAMPLE_BOOK_ID,
            status: LoanStatus.ACTIVE,
            userId: SAMPLE_USER_ID,
          }),
        })
      );
      expect(mockPrismaBookLoan.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: SAMPLE_USER_ID }),
        })
      );
    });
  });

  describe("GET /book-loans/overdue", () => {
    it("returns overdue loans", async () => {
      const overdueLoan = buildLoan({ id: "loan-overdue" });
      mockPrismaBookLoan.findMany.mockResolvedValueOnce([overdueLoan]);

      const response = await request(app).get("/book-loans/overdue");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        count: 1,
        data: [overdueLoan],
        success: true,
      });
      expect(mockPrismaBookLoan.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { dueDate: "asc" },
          where: expect.objectContaining({ status: "ACTIVE" }),
        })
      );
    });
  });

  describe("GET /book-loans/:id", () => {
    it("returns 404 when loan not found", async () => {
      mockPrismaBookLoan.findUnique.mockResolvedValueOnce(null);

      const response = await request(app).get("/book-loans/non-existent");

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        message: "Book loan not found",
        success: false,
      });
    });

    it("returns loan details when found", async () => {
      const loan = buildLoan({ id: "loan-detail" });
      mockPrismaBookLoan.findUnique.mockResolvedValueOnce(loan);

      const response = await request(app).get(`/book-loans/${loan.id}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        data: loan,
        success: true,
      });
      expect(mockPrismaBookLoan.findUnique).toHaveBeenCalledWith({
        include: expect.any(Object),
        where: { id: loan.id },
      });
    });
  });

  describe("POST /book-loans", () => {
    const validPayload = {
      bookId: SAMPLE_BOOK_ID,
      dueDate: "2024-05-08T00:00:00.000Z",
      loanDate: "2024-05-01T00:00:00.000Z",
      userId: SAMPLE_USER_ID,
    };

    it("requires authentication", async () => {
      const response = await request(app).post("/book-loans").send({});

      expect(response.status).toBe(401);
      expect(checkStaffOrAdminMock).toHaveBeenCalled();
    });

    it("returns 404 when user does not exist", async () => {
      mockPrismaUser.findUnique.mockResolvedValueOnce(null);

      const response = await request(app)
        .post("/book-loans")
        .set(staffHeaders())
        .send(validPayload);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        message: "User not found",
        success: false,
      });
    });

    it("rejects when book is not available", async () => {
      mockPrismaBook.findUnique.mockResolvedValueOnce({
        ...sampleBookRecord,
        availableQuantity: 0,
      });

      const response = await request(app)
        .post("/book-loans")
        .set(staffHeaders())
        .send(validPayload);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        message: "Book not available for loan",
        success: false,
      });
      expect(mockTransaction).not.toHaveBeenCalled();
    });

    it("rejects when an active loan already exists", async () => {
      mockPrismaBookLoan.findFirst.mockResolvedValueOnce({
        id: "existing-loan",
      });

      const response = await request(app)
        .post("/book-loans")
        .set(staffHeaders())
        .send(validPayload);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        message: "User already has an active loan for this book",
        success: false,
      });
      expect(mockTransaction).not.toHaveBeenCalled();
    });

    it("creates a new loan and updates book availability", async () => {
      const createdLoan = buildLoan({
        id: "loan-created",
        lateFeesPerDay: 5000,
      });

      lastTransactionClient.bookLoan.create.mockResolvedValueOnce(createdLoan);

      const response = await request(app)
        .post("/book-loans")
        .set(staffHeaders())
        .send(validPayload);

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        data: createdLoan,
        message: "Book loan created successfully",
        success: true,
      });
      expect(mockTransaction).toHaveBeenCalledTimes(1);
      expect(lastTransactionClient.bookLoan.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          bookId: SAMPLE_BOOK_ID,
          userId: SAMPLE_USER_ID,
        }),
        include: expect.any(Object),
      });
      expect(lastTransactionClient.book.update).toHaveBeenCalledWith({
        data: { availableQuantity: sampleBookRecord.availableQuantity - 1 },
        where: { id: SAMPLE_BOOK_ID },
      });
    });
  });

  describe("PUT /book-loans/:id/return", () => {
    const returnPayload = {
      returnDate: "2024-05-10T00:00:00.000Z",
    };

    it("returns 404 when loan is missing", async () => {
      mockPrismaBookLoan.findUnique.mockResolvedValueOnce(null);

      const response = await request(app)
        .put("/book-loans/loan-missing/return")
        .set(staffHeaders())
        .send(returnPayload);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        message: "Book loan not found",
        success: false,
      });
    });

    it("rejects when loan is not active", async () => {
      mockPrismaBookLoan.findUnique.mockResolvedValueOnce(
        buildLoan({ status: LoanStatus.RETURNED })
      );

      const response = await request(app)
        .put("/book-loans/loan-returned/return")
        .set(staffHeaders())
        .send(returnPayload);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        message: "Book loan is not active",
        success: false,
      });
    });

    it("marks a loan as returned and calculates late fees", async () => {
      const activeLoan = buildLoan({
        bookId: SAMPLE_BOOK_ID,
        dueDate: new Date("2024-05-05T00:00:00.000Z"),
        id: "loan-return",
        userId: SAMPLE_USER_ID,
      });

      mockPrismaBookLoan.findUnique.mockResolvedValueOnce({
        ...activeLoan,
        book: { availableQuantity: 2, id: SAMPLE_BOOK_ID },
      });

      const returnedLoan = buildLoan({
        fine: 10000,
        id: "loan-return",
        returnDate: new Date("2024-05-10T00:00:00.000Z"),
        status: LoanStatus.RETURNED,
      });

      lastTransactionClient.bookLoan.update.mockResolvedValueOnce(returnedLoan);

      const response = await request(app)
        .put(`/book-loans/${activeLoan.id}/return`)
        .set(staffHeaders())
        .send(returnPayload);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        data: returnedLoan,
        message: "Book returned successfully",
        success: true,
      });
      expect(lastTransactionClient.bookLoan.update).toHaveBeenCalledWith({
        data: expect.objectContaining({
          fine: 10000,
          status: LoanStatus.RETURNED,
        }),
        include: expect.any(Object),
        where: { id: activeLoan.id },
      });
      expect(lastTransactionClient.book.update).toHaveBeenCalledWith({
        data: { availableQuantity: 3 },
        where: { id: SAMPLE_BOOK_ID },
      });
    });
  });

  describe("PUT /book-loans/:id/extend", () => {
    const extendPayload = { extensionDays: 5 };

    it("returns 404 when loan not found", async () => {
      mockPrismaBookLoan.findUnique.mockResolvedValueOnce(null);

      const response = await request(app)
        .put("/book-loans/loan-missing/extend")
        .set(staffHeaders())
        .send(extendPayload);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        message: "Book loan not found",
        success: false,
      });
    });

    it("rejects when max renewals reached", async () => {
      mockPrismaBookLoan.findUnique.mockResolvedValueOnce(
        buildLoan({ maxRenewals: 1, renewalCount: 1 })
      );

      const response = await request(app)
        .put("/book-loans/loan-full/extend")
        .set(staffHeaders())
        .send(extendPayload);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        message: "Maximum extensions reached (1 times)",
        success: false,
      });
    });

    it("extends loan due date when conditions met", async () => {
      const loan = buildLoan({ id: "loan-extend" });
      mockPrismaBookLoan.findUnique.mockResolvedValueOnce(loan);

      const updatedLoan = buildLoan({
        dueDate: new Date("2024-05-13T00:00:00.000Z"),
        id: "loan-extend",
        renewalCount: loan.renewalCount + 1,
      });

      mockPrismaBookLoan.update.mockResolvedValueOnce(updatedLoan);

      const response = await request(app)
        .put(`/book-loans/${loan.id}/extend`)
        .set(staffHeaders())
        .send(extendPayload);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        data: updatedLoan,
        message: "Book loan extended successfully",
        success: true,
      });
      expect(mockPrismaBookLoan.update).toHaveBeenCalledWith({
        data: {
          dueDate: expect.any(Date),
          renewalCount: loan.renewalCount + 1,
        },
        include: expect.any(Object),
        where: { id: loan.id },
      });
    });
  });
});
