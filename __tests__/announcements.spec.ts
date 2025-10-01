/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { UserRole } from "@prisma/client";
import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, MockedFunction, vi } from "vitest";

import announcementsRouter from "../routes/announcements.js";

const checkStaffOrAdminMock = vi.fn();

vi.mock("#middleware/auth.js", () => ({
  checkStaffOrAdmin: (req: any, res: any, next: any) => {
    checkStaffOrAdminMock(req, res, next);
  },
}));

vi.mock("#lib/prisma.js", () => ({
  default: {
    announcement: {
      count: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import prisma from "#lib/prisma.js";

const mockPrismaAnnouncement = prisma.announcement as unknown as {
  count: MockedFunction<any>;
  create: MockedFunction<any>;
  findMany: MockedFunction<any>;
  findUnique: MockedFunction<any>;
  update: MockedFunction<any>;
};

describe("Announcements Routes", () => {
  let app: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    checkStaffOrAdminMock.mockImplementation((req: any, res: any, next: any) => {
      const role = req.headers["x-test-role"] as string | undefined;
      req.isAuthenticated = (() => Boolean(role)) as typeof req.isAuthenticated;

      if (!role) {
        res.status(401).json({
          message: "Authentication required",
          success: false,
        });
        return;
      }

      if (role !== UserRole.STAFF && role !== UserRole.ADMIN) {
        res.status(403).json({
          message: "Staff or Admin access required",
          success: false,
        });
        return;
      }

      req.user = { id: "test-user", role };
      next();
    });
    app = express();
    app.use(express.json());
    app.use("/announcements", announcementsRouter);
  });

  const sampleAnnouncement = {
    content: "Content",
    createdAt: new Date().toISOString(),
    createdBy: "507f1f77bcf86cd799439011",
    id: "ann-1",
    isActive: true,
    priority: "HIGH",
    targetAudience: "ALL",
    title: "Title",
    type: "EVENT",
  };

  describe("GET /announcements", () => {
    it("returns paginated announcements", async () => {
      const announcements = [sampleAnnouncement];
      mockPrismaAnnouncement.findMany.mockResolvedValueOnce(announcements);
      mockPrismaAnnouncement.count.mockResolvedValueOnce(1);

      const response = await request(app).get("/announcements").query({
        limit: "10",
        page: "1",
        priority: "HIGH",
        targetAudience: "ALL",
        type: "EVENT",
      });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        count: announcements.length,
        data: announcements,
        page: 1,
        success: true,
        total: 1,
        totalPages: 1,
      });
      expect(mockPrismaAnnouncement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: "desc" },
          where: expect.objectContaining({ isActive: true }),
        })
      );
    });
  });

  describe("GET /announcements/:id", () => {
    it("returns announcement when found", async () => {
      mockPrismaAnnouncement.findUnique.mockResolvedValueOnce(
        sampleAnnouncement
      );

      const response = await request(app).get("/announcements/ann-1");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        data: sampleAnnouncement,
        success: true,
      });
    });

    it("returns 404 when not found", async () => {
      mockPrismaAnnouncement.findUnique.mockResolvedValueOnce(null);

      const response = await request(app).get("/announcements/unknown");

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        message: "Announcement not found",
        success: false,
      });
    });
  });

  describe("POST /announcements", () => {
    const validPayload = {
      content: "New announcement",
      createdBy: "507f1f77bcf86cd799439011",
      priority: "HIGH",
      targetAudience: "ALL",
      title: "Important",
      type: "EVENT",
    };

    it("rejects unauthenticated requests", async () => {
      const response = await request(app)
        .post("/announcements")
        .send(validPayload);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(mockPrismaAnnouncement.create).not.toHaveBeenCalled();
    });

    it("creates announcement for staff", async () => {
      const createdAnnouncement = { ...sampleAnnouncement, ...validPayload };
      mockPrismaAnnouncement.create.mockResolvedValueOnce(
        createdAnnouncement
      );

      const response = await request(app)
        .post("/announcements")
        .set("x-test-role", UserRole.STAFF)
        .send(validPayload);

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        data: createdAnnouncement,
        message: "Announcement created successfully",
        success: true,
      });
      expect(mockPrismaAnnouncement.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          content: validPayload.content,
          createdBy: validPayload.createdBy,
        }),
      });
    });
  });

  describe("PUT /announcements/:id", () => {
    it("updates announcement fields", async () => {
      const updatedAnnouncement = {
        ...sampleAnnouncement,
        title: "Updated",
      };
      mockPrismaAnnouncement.update.mockResolvedValueOnce(updatedAnnouncement);

      const response = await request(app)
        .put("/announcements/ann-1")
        .set("x-test-role", UserRole.ADMIN)
        .send({ title: "Updated" });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        data: updatedAnnouncement,
        message: "Announcement updated successfully",
        success: true,
      });
      expect(mockPrismaAnnouncement.update).toHaveBeenCalledWith({
        data: { title: "Updated" },
        where: { id: "ann-1" },
      });
    });

    it("returns 404 when record missing", async () => {
      mockPrismaAnnouncement.update.mockRejectedValueOnce(
        new Error("Record to update not found")
      );

      const response = await request(app)
        .put("/announcements/missing")
        .set("x-test-role", UserRole.STAFF)
        .send({ title: "Updated" });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        message: "Announcement not found",
        success: false,
      });
    });
  });

  describe("DELETE /announcements/:id", () => {
    it("soft deletes announcement", async () => {
      mockPrismaAnnouncement.update.mockResolvedValueOnce({});

      const response = await request(app)
        .delete("/announcements/ann-1")
        .set("x-test-role", UserRole.STAFF);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        message: "Announcement deleted successfully",
        success: true,
      });
      expect(mockPrismaAnnouncement.update).toHaveBeenCalledWith({
        data: { isActive: false },
        where: { id: "ann-1" },
      });
    });

    it("returns 404 when announcement missing", async () => {
      mockPrismaAnnouncement.update.mockRejectedValueOnce(
        new Error("Record to update not found")
      );

      const response = await request(app)
        .delete("/announcements/missing")
        .set("x-test-role", UserRole.ADMIN);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        message: "Announcement not found",
        success: false,
      });
    });
  });
});
