/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { UserRole } from "@prisma/client";
import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, MockedFunction, vi } from "vitest";

import booksRouter from "../routes/books.js";

vi.mock("../lib/prisma.js", () => ({
  default: {
    book: {
      count: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import prisma from "../lib/prisma.js";

const mockPrismaBook = prisma.book as unknown as {
  count: MockedFunction<any>;
  create: MockedFunction<any>;
  findMany: MockedFunction<any>;
  findUnique: MockedFunction<any>;
  update: MockedFunction<any>;
};

const baseBook = {
  author: "Author Name",
  availableQuantity: 5,
  category: "Fiction",
  coverImage: "https://example.com/cover.jpg",
  description: "A captivating story",
  genre: ["Drama"],
  id: "book-id-1",
  isbn: "9783161484100",
  language: "Indonesian",
  location: "Shelf A1",
  pages: 320,
  publisher: "Publisher",
  publishYear: 2024,
  quantity: 5,
  title: "Sample Book",
};

interface TestUser {
  id: string;
  role: UserRole;
}

const createApp = (options: { user?: TestUser } = {}) => {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    req.body = req.body ?? {};
    req.user = options.user;
    req.isAuthenticated = vi.fn(() => Boolean(options.user));
    next();
  });
  app.use("/books", booksRouter);
  return app;
};

describe("Books Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrismaBook.findMany.mockResolvedValue([]);
    mockPrismaBook.count.mockResolvedValue(0);
    mockPrismaBook.findUnique.mockResolvedValue(null);
  });

  describe("GET /books", () => {
    it("returns paginated books with filters", async () => {
      const books = [
        { ...baseBook },
        { ...baseBook, id: "book-id-2", title: "Another Book" },
      ];
      mockPrismaBook.findMany.mockResolvedValueOnce(books);
      mockPrismaBook.count.mockResolvedValueOnce(2);

      const app = createApp();
      const response = await request(app).get("/books").query({
        author: "Author",
        available: "true",
        category: "Fiction",
        limit: 2,
        page: 1,
      });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        count: books.length,
        data: books,
        page: 1,
        success: true,
        total: 2,
        totalPages: 1,
      });
      expect(mockPrismaBook.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { addedDate: "desc" },
          skip: 0,
          take: 2,
        })
      );
      expect(mockPrismaBook.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: true }),
        })
      );
    });
  });

  describe("GET /books/:id", () => {
    it("returns 404 when book not found", async () => {
      mockPrismaBook.findUnique.mockResolvedValueOnce(null);

      const app = createApp();
      const response = await request(app).get("/books/nonexistent-id");

      expect(mockPrismaBook.findUnique).toHaveBeenCalledWith({
        where: { id: "nonexistent-id" },
      });
      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        message: "Book not found",
        success: false,
      });
    });
  });

  describe("POST /books", () => {
    const staffApp = () =>
      createApp({
        user: {
          id: "staff-user",
          role: UserRole.STAFF,
        },
      });

    it("creates a book when user is staff", async () => {
      mockPrismaBook.findUnique.mockResolvedValueOnce(null);
      mockPrismaBook.create.mockResolvedValueOnce(baseBook);

      const response = await request(staffApp()).post("/books").send({
        author: baseBook.author,
        availableQuantity: baseBook.availableQuantity,
        category: baseBook.category,
        coverImage: baseBook.coverImage,
        description: baseBook.description,
        genre: baseBook.genre,
        isbn: baseBook.isbn,
        language: baseBook.language,
        location: baseBook.location,
        pages: baseBook.pages,
        publisher: baseBook.publisher,
        publishYear: baseBook.publishYear,
        quantity: baseBook.quantity,
        title: baseBook.title,
      });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        data: baseBook,
        message: "Book added successfully",
        success: true,
      });
      expect(mockPrismaBook.findUnique).toHaveBeenCalledWith({
        where: { isbn: baseBook.isbn },
      });
      expect(mockPrismaBook.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          author: baseBook.author,
          title: baseBook.title,
        }),
      });
    });

    it("rejects creation when ISBN already exists", async () => {
      mockPrismaBook.findUnique.mockResolvedValueOnce(baseBook);

      const response = await request(staffApp()).post("/books").send({
        author: baseBook.author,
        availableQuantity: baseBook.availableQuantity,
        category: baseBook.category,
        coverImage: baseBook.coverImage,
        description: baseBook.description,
        genre: baseBook.genre,
        isbn: baseBook.isbn,
        language: baseBook.language,
        location: baseBook.location,
        pages: baseBook.pages,
        publisher: baseBook.publisher,
        publishYear: baseBook.publishYear,
        quantity: baseBook.quantity,
        title: baseBook.title,
      });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        message: "ISBN already exists",
        success: false,
      });
      expect(mockPrismaBook.create).not.toHaveBeenCalled();
    });

    it("requires authentication", async () => {
      const app = createApp();
      const response = await request(app).post("/books").send({});

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        message: "Authentication required",
        success: false,
      });
    });
  });

  describe("PUT /books/:id", () => {
    const staffApp = () =>
      createApp({ user: { id: "staff-user", role: UserRole.STAFF } });

    it("updates a book successfully", async () => {
      const updatedBook = { ...baseBook, title: "Updated Title" };
      mockPrismaBook.update.mockResolvedValueOnce(updatedBook);

      const response = await request(staffApp())
        .put(`/books/${baseBook.id}`)
        .send({ title: "Updated Title" });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        data: updatedBook,
        message: "Book updated successfully",
        success: true,
      });
      expect(mockPrismaBook.update).toHaveBeenCalledWith({
        data: { title: "Updated Title" },
        where: { id: baseBook.id },
      });
    });

    it("returns 404 when book to update is missing", async () => {
      mockPrismaBook.update.mockRejectedValueOnce(
        new Error("Record to update not found")
      );

      const response = await request(staffApp())
        .put(`/books/${baseBook.id}`)
        .send({ title: "Updated Title" });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        message: "Book not found",
        success: false,
      });
    });
  });

  describe("PUT /books/:id/quantity", () => {
    it("updates book quantities", async () => {
      const updatedBook = { ...baseBook, availableQuantity: 3, quantity: 6 };
      mockPrismaBook.update.mockResolvedValueOnce(updatedBook);

      const app = createApp({
        user: { id: "staff-user", role: UserRole.STAFF },
      });

      const response = await request(app)
        .put(`/books/${baseBook.id}/quantity`)
        .send({ availableQuantity: 3, quantity: 6 });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        data: updatedBook,
        message: "Book quantity updated successfully",
        success: true,
      });
      expect(mockPrismaBook.update).toHaveBeenCalledWith({
        data: { availableQuantity: 3, quantity: 6 },
        where: { id: baseBook.id },
      });
    });
  });

  describe("DELETE /books/:id", () => {
    it("soft deletes a book", async () => {
      mockPrismaBook.update.mockResolvedValueOnce({
        ...baseBook,
        isActive: false,
      });

      const app = createApp({
        user: { id: "admin-user", role: UserRole.ADMIN },
      });

      const response = await request(app).delete(`/books/${baseBook.id}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        message: "Book removed successfully",
        success: true,
      });
      expect(mockPrismaBook.update).toHaveBeenCalledWith({
        data: { isActive: false },
        where: { id: baseBook.id },
      });
    });
  });
});
