import { checkStaffOrAdmin } from "#middleware/auth.js";
import { validateMultiple, validateSchema } from "#middleware/validation.js";
import { IdParamSchema } from "#validations/queries.js";
import {
  CreateRoomBookingSchema,
  GetRoomBookingsQuerySchema,
  UpdateRoomBookingStatusSchema,
} from "#validations/roomBookings.js";
import {
  GetRoomQuerySchema,
  RoomIdParamSchema,
  RoomQuerySchema,
} from "#validations/rooms.js";
import { Prisma } from "@prisma/client";
import express from "express";

import prisma from "../lib/prisma.js";

const router = express.Router();

// GET /api/rooms
router.get(
  "/",
  validateSchema(GetRoomQuerySchema, "query"),
  async (req, res) => {
    try {
      const { available, type } = req.query;
      const where: Prisma.RoomWhereInput = {};

      if (type) where.type = type as Prisma.RoomWhereInput["type"];
      if (available !== undefined) where.isAvailable = available === "true";

      const rooms = await prisma.room.findMany({
        orderBy: { roomNumber: "asc" },
        where,
      });

      res.json({
        count: rooms.length,
        data: rooms,
        success: true,
      });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "Unknown error",
        message: "Failed to fetch rooms",
        success: false,
      });
    }
  }
);

// GET /api/rooms/availability/:roomId
router.get(
  "/availability/:roomId",
  validateMultiple({ params: RoomIdParamSchema, query: RoomQuerySchema }),
  async (req, res) => {
    try {
      const { date } = req.query;

      if (!date) {
        return res.status(400).json({
          message: "Date parameter is required",
          success: false,
        });
      }

      const bookingDate = new Date(date as string);
      const dayOfWeek = bookingDate.getDay();

      // check if it's a weekday
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        return res.json({
          available: false,
          message: "Bookings are only available on weekdays",
          success: true,
        });
      }

      // get existing bookings for the date
      const startOfDay = new Date(bookingDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(bookingDate);
      endOfDay.setHours(23, 59, 59, 999);

      const existingBookings = await prisma.roomBooking.findMany({
        orderBy: { startTime: "asc" },
        select: {
          duration: true,
          endTime: true,
          startTime: true,
        },
        where: {
          bookingDate: {
            gte: startOfDay,
            lt: endOfDay,
          },
          roomId: req.params.roomId,
          status: { in: ["PENDING", "CONFIRMED"] },
        },
      });

      res.json({
        available: true,
        existingBookings,
        success: true,
      });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "Unknown error",
        message: "Failed to check availability",
        success: false,
      });
    }
  }
);

// GET /api/rooms/bookings
router.get(
  "/bookings",
  validateSchema(GetRoomBookingsQuerySchema, "query"),
  async (req, res) => {
    try {
      const { date, limit = 20, page = 1, roomId, status, userId } = req.query;
      const where: Prisma.RoomBookingWhereInput = {};

      if (userId)
        where.userId = userId as Prisma.RoomBookingWhereInput["userId"];
      if (roomId)
        where.roomId = roomId as Prisma.RoomBookingWhereInput["roomId"];
      if (status)
        where.status = status as Prisma.RoomBookingWhereInput["status"];
      if (date) {
        const bookingDate = new Date(date as string);
        const startOfDay = new Date(bookingDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(bookingDate);
        endOfDay.setHours(23, 59, 59, 999);

        where.bookingDate = {
          gte: startOfDay,
          lt: endOfDay,
        };
      }

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      const [bookings, total] = await Promise.all([
        prisma.roomBooking.findMany({
          include: {
            room: {
              select: {
                hourlyRate: true,
                name: true,
                roomNumber: true,
                type: true,
              },
            },
            user: {
              select: { name: true, phoneNumber: true },
            },
          },
          orderBy: { createdAt: "desc" },
          skip,
          take: limitNum,
          where,
        }),
        prisma.roomBooking.count({ where }),
      ]);

      res.json({
        count: bookings.length,
        data: bookings,
        page: pageNum,
        success: true,
        total,
        totalPages: Math.ceil(total / limitNum),
      });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "Unknown error",
        message: "Failed to fetch bookings",
        success: false,
      });
    }
  }
);

// POST /api/rooms/bookings
router.post(
  "/bookings",
  validateSchema(CreateRoomBookingSchema),
  checkStaffOrAdmin,
  async (req, res) => {
    try {
      const {
        bookingDate,
        endTime,
        purpose,
        roomId,
        specialRequests,
        startTime,
        userId,
      } = req.body as Prisma.RoomBookingWhereInput;

      // Validate required fields
      if (!userId || !roomId || !bookingDate || !startTime || !endTime) {
        return res.status(400).json({
          message: "Missing required fields",
          success: false,
        });
      }

      // Check if room exists and is available
      const room = await prisma.room.findUnique({
        where: { id: roomId as string },
      });

      if (!room?.isAvailable) {
        return res.status(400).json({
          message: "Room not available",
          success: false,
        });
      }

      const start = new Date(startTime as string);
      const end = new Date(endTime as string);
      const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

      // check minimum duration (1 hour)
      if (duration < 1) {
        return res.status(400).json({
          message: "Minimum booking duration is 1 hour",
          success: false,
        });
      }

      // check for conflicting bookings
      const conflictingBooking = await prisma.roomBooking.findFirst({
        where: {
          OR: [
            {
              endTime: { gt: start },
              startTime: { lt: end },
            },
          ],
          roomId,
          status: { in: ["PENDING", "CONFIRMED"] },
        },
      });

      if (conflictingBooking) {
        return res.status(400).json({
          message: "Time slot conflicts with existing booking",
          success: false,
        });
      }

      const booking = await prisma.roomBooking.create({
        data: {
          bookingDate: new Date(bookingDate as string),
          duration,
          endTime: end,
          purpose: purpose as string,
          roomId: roomId as string,
          specialRequests: specialRequests as string,
          startTime: start,
          totalCost: room.hourlyRate * duration,
          userId: userId as string,
        },
        include: {
          room: {
            select: {
              hourlyRate: true,
              name: true,
              roomNumber: true,
              type: true,
            },
          },
          user: {
            select: { name: true, phoneNumber: true },
          },
        },
      });

      res.status(201).json({
        data: booking,
        message: "Room booked successfully",
        success: true,
      });
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Unknown error",
        message: "Failed to create booking",
        success: false,
      });
    }
  }
);

// PUT /api/rooms/bookings/:id/status
router.put(
  "/bookings/:id/status",
  validateMultiple({
    body: UpdateRoomBookingStatusSchema,
    params: IdParamSchema,
  }),
  checkStaffOrAdmin,
  async (req, res) => {
    try {
      const { paymentStatus, status } =
        req.body as Prisma.RoomBookingUpdateInput;

      const updateData: Prisma.RoomBookingUpdateInput = {};
      if (status) updateData.status = status;
      if (paymentStatus) updateData.paymentStatus = paymentStatus;

      const booking = await prisma.roomBooking.update({
        data: updateData,
        include: {
          room: {
            select: {
              hourlyRate: true,
              name: true,
              roomNumber: true,
              type: true,
            },
          },
          user: {
            select: { name: true, phoneNumber: true },
          },
        },
        where: { id: req.params.id },
      });

      res.json({
        data: booking,
        message: "Booking status updated successfully",
        success: true,
      });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("Record to update not found")
      ) {
        return res.status(404).json({
          message: "Booking not found",
          success: false,
        });
      }

      res.status(400).json({
        error: error instanceof Error ? error.message : "Unknown error",
        message: "Failed to update booking status",
        success: false,
      });
    }
  }
);

// DELETE /api/rooms/bookings/:id
router.delete(
  "/bookings/:id",
  validateSchema(IdParamSchema, "params"),
  checkStaffOrAdmin,
  async (req, res) => {
    try {
      await prisma.roomBooking.update({
        data: { status: "CANCELLED" },
        where: { id: req.params.id },
      });

      res.json({
        message: "Booking cancelled successfully",
        success: true,
      });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("Record to update not found")
      ) {
        return res.status(404).json({
          message: "Booking not found",
          success: false,
        });
      }

      res.status(500).json({
        error: error instanceof Error ? error.message : "Unknown error",
        message: "Failed to cancel booking",
        success: false,
      });
    }
  }
);

export default router;
