/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { BookingStatus, PaymentStatus, UserRole } from "@prisma/client";
import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, MockedFunction, vi } from "vitest";

import roomsRouter from "../routes/rooms.js";

const checkStaffOrAdminMock = vi.fn();

vi.mock("#middleware/auth.js", () => ({
  checkStaffOrAdmin: (req: any, res: any, next: any) => {
    checkStaffOrAdminMock(req, res, next);
  },
}));

vi.mock("#lib/prisma.js", () => ({
  default: {
    room: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    roomBooking: {
      count: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

const prismaModule = await import("#lib/prisma.js");
const prisma = prismaModule.default;

const mockPrismaRoom = prisma.room as unknown as {
  findMany: MockedFunction<any>;
  findUnique: MockedFunction<any>;
};

const mockPrismaRoomBooking = prisma.roomBooking as unknown as {
  count: MockedFunction<any>;
  create: MockedFunction<any>;
  findFirst: MockedFunction<any>;
  findMany: MockedFunction<any>;
  update: MockedFunction<any>;
};

describe("Rooms Routes", () => {
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
    app.use("/rooms", roomsRouter);
  });

  const sampleRoom = {
    id: "room-1",
    isAvailable: true,
    name: "Discussion Room",
    roomNumber: "A1",
    type: "SMALL_DISCUSSION",
  };

  const sampleBooking = {
    bookingDate: new Date("2024-05-06T00:00:00.000Z"),
    duration: 2,
    endTime: new Date("2024-05-06T11:00:00.000Z"),
    id: "booking-1",
    paymentStatus: PaymentStatus.UNPAID,
    purpose: "Team meeting",
    room: {
      hourlyRate: 100000,
      name: "Discussion Room",
      roomNumber: "A1",
      type: "SMALL_DISCUSSION",
    },
    startTime: new Date("2024-05-06T09:00:00.000Z"),
    status: BookingStatus.PENDING,
    totalCost: 200000,
    user: {
      name: "John Doe",
      phoneNumber: "+1234567890",
    },
  };

  describe("GET /rooms", () => {
    it("returns rooms with filters", async () => {
      mockPrismaRoom.findMany.mockResolvedValueOnce([sampleRoom]);

      const response = await request(app)
        .get("/rooms")
        .query({ available: "true", type: "SMALL_DISCUSSION" });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        count: 1,
        data: [sampleRoom],
        success: true,
      });
      expect(mockPrismaRoom.findMany).toHaveBeenCalledWith({
        orderBy: { roomNumber: "asc" },
        where: { isAvailable: true, type: "SMALL_DISCUSSION" },
      });
    });
  });

  describe("GET /rooms/availability/:roomId", () => {
    it("requires date parameter", async () => {
      const response = await request(app).get(
        "/rooms/availability/507f1f77bcf86cd799439011"
      );

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        message: "Date parameter is required",
        success: false,
      });
    });

    it("returns unavailable on weekends", async () => {
      const response = await request(app)
        .get("/rooms/availability/507f1f77bcf86cd799439011")
        .query({ date: "2024-05-05T00:00:00.000Z" });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        available: false,
        message: "Bookings are only available on weekdays",
        success: true,
      });
      expect(mockPrismaRoomBooking.findMany).not.toHaveBeenCalled();
    });

    it("returns existing bookings for weekdays", async () => {
      const existingBookings = [
        {
          duration: 2,
          endTime: new Date("2024-05-06T11:00:00.000Z"),
          startTime: new Date("2024-05-06T09:00:00.000Z"),
        },
      ];
      mockPrismaRoomBooking.findMany.mockResolvedValueOnce(existingBookings);

      const response = await request(app)
        .get("/rooms/availability/507f1f77bcf86cd799439011")
        .query({ date: "2024-05-06T00:00:00.000Z" });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        available: true,
        existingBookings,
        success: true,
      });
      expect(mockPrismaRoomBooking.findMany).toHaveBeenCalled();
    });
  });

  describe("GET /rooms/bookings", () => {
    it("returns paginated bookings", async () => {
      mockPrismaRoomBooking.findMany.mockResolvedValueOnce([sampleBooking]);
      mockPrismaRoomBooking.count.mockResolvedValueOnce(1);

      const response = await request(app)
        .get("/rooms/bookings")
        .query({ date: "2024-05-06T00:00:00.000Z" });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        count: 1,
        data: [sampleBooking],
        page: 1,
        success: true,
        total: 1,
        totalPages: 1,
      });
      expect(mockPrismaRoomBooking.findMany).toHaveBeenCalled();
      expect(mockPrismaRoomBooking.count).toHaveBeenCalled();
    });
  });

  describe("POST /rooms/bookings", () => {
    const basePayload = {
      bookingDate: "2024-05-06T00:00:00.000Z",
      endTime: "2024-05-06T11:00:00.000Z",
      roomId: "507f1f77bcf86cd799439011",
      startTime: "2024-05-06T09:00:00.000Z",
      userId: "507f191e810c19729de860ea",
    };

    it("rejects unauthenticated requests", async () => {
      const response = await request(app)
        .post("/rooms/bookings")
        .send(basePayload);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it("validates room availability", async () => {
      mockPrismaRoom.findUnique.mockResolvedValueOnce({
        ...sampleRoom,
        isAvailable: false,
      });

      const response = await request(app)
        .post("/rooms/bookings")
        .set("x-test-role", UserRole.STAFF)
        .send(basePayload);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        message: "Room not available",
        success: false,
      });
    });

    it("rejects conflicting bookings", async () => {
      mockPrismaRoom.findUnique.mockResolvedValueOnce({
        ...sampleRoom,
        hourlyRate: 100000,
      });
      mockPrismaRoomBooking.findFirst.mockResolvedValueOnce({ id: "conflict" });

      const response = await request(app)
        .post("/rooms/bookings")
        .set("x-test-role", UserRole.ADMIN)
        .send(basePayload);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        message: "Time slot conflicts with existing booking",
        success: false,
      });
    });

    it("creates booking successfully", async () => {
      mockPrismaRoom.findUnique.mockResolvedValueOnce({
        ...sampleRoom,
        hourlyRate: 100000,
      });
      mockPrismaRoomBooking.findFirst.mockResolvedValueOnce(null);
      mockPrismaRoomBooking.create.mockResolvedValueOnce(sampleBooking);

      const response = await request(app)
        .post("/rooms/bookings")
        .set("x-test-role", UserRole.STAFF)
        .send({ ...basePayload, purpose: "Meeting" });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        data: sampleBooking,
        message: "Room booked successfully",
        success: true,
      });
      expect(mockPrismaRoomBooking.create).toHaveBeenCalled();
    });
  });

  describe("PUT /rooms/bookings/:id/status", () => {
    it("updates booking status", async () => {
      const updatedBooking = {
        ...sampleBooking,
        paymentStatus: PaymentStatus.PAID,
        status: BookingStatus.CONFIRMED,
      };
      mockPrismaRoomBooking.update.mockResolvedValueOnce(updatedBooking);

      const response = await request(app)
        .put("/rooms/bookings/booking-1/status")
        .set("x-test-role", UserRole.STAFF)
        .send({ paymentStatus: PaymentStatus.PAID, status: BookingStatus.CONFIRMED });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        data: updatedBooking,
        message: "Booking status updated successfully",
        success: true,
      });
    });

    it("returns 404 when booking missing", async () => {
      mockPrismaRoomBooking.update.mockRejectedValueOnce(
        new Error("Record to update not found")
      );

      const response = await request(app)
        .put("/rooms/bookings/unknown/status")
        .set("x-test-role", UserRole.ADMIN)
        .send({ status: BookingStatus.CANCELLED });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        message: "Booking not found",
        success: false,
      });
    });
  });

  describe("DELETE /rooms/bookings/:id", () => {
    it("cancels booking", async () => {
      mockPrismaRoomBooking.update.mockResolvedValueOnce({});

      const response = await request(app)
        .delete("/rooms/bookings/booking-1")
        .set("x-test-role", UserRole.STAFF);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        message: "Booking cancelled successfully",
        success: true,
      });
      expect(mockPrismaRoomBooking.update).toHaveBeenCalledWith({
        data: { status: BookingStatus.CANCELLED },
        where: { id: "booking-1" },
      });
    });

    it("returns 404 when booking missing", async () => {
      mockPrismaRoomBooking.update.mockRejectedValueOnce(
        new Error("Record to update not found")
      );

      const response = await request(app)
        .delete("/rooms/bookings/missing")
        .set("x-test-role", UserRole.ADMIN);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        message: "Booking not found",
        success: false,
      });
    });
  });
});
