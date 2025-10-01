import { mongoId } from "#utils/validation.js";
import { z } from "zod";

// ============================
// ENUMS
// ============================
export const BookingStatusSchema = z.enum([
  "PENDING",
  "CONFIRMED",
  "CANCELLED",
  "COMPLETED",
]);
export const PaymentStatusSchema = z.enum(["UNPAID", "PAID", "REFUNDED"]);

// ============================
// USER SCHEMAS
// ============================

export const GetRoomBookingsQuerySchema = z.object({
  date: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: "Invalid date format",
    })
    .optional(),
  limit: z.number().min(0).optional().default(20),
  page: z.number().min(1).optional().default(1),
  roomId: mongoId.optional(),
  status: BookingStatusSchema.optional(),
  userId: mongoId.optional(),
});

export const CreateRoomBookingSchema = z
  .object({
    bookingDate: z.iso.datetime().or(z.date()),
    endTime: z.iso.datetime().or(z.date()),
    purpose: z.string().max(200, "Purpose too long").optional(),
    roomId: z.string().min(1, "Room ID is required"),
    specialRequests: z
      .string()
      .max(500, "Special requests too long")
      .optional(),
    startTime: z.iso.datetime().or(z.date()),
    userId: z.string().min(1, "User ID is required"),
  })
  .refine(
    (data) => {
      const start = new Date(data.startTime);
      const end = new Date(data.endTime);
      return end > start;
    },
    {
      message: "End time must be after start time",
      path: ["endTime"],
    }
  );

export const UpdateRoomBookingStatusSchema = z.object({
  paymentStatus: PaymentStatusSchema.optional(),
  status: BookingStatusSchema.optional(),
});

export const UpdateRoomBookingSchema = z.object({
  bookingDate: z.iso.datetime().or(z.date()).optional(),
  endTime: z.iso.datetime().or(z.date()).optional(),
  paymentStatus: PaymentStatusSchema.optional(),
  purpose: z.string().max(200, "Purpose too long").optional(),
  specialRequests: z.string().max(500, "Special requests too long").optional(),
  startTime: z.iso.datetime().or(z.date()).optional(),
  status: BookingStatusSchema.optional(),
});

// ============================
// EXPORT TYPES
// ============================
export type CreateRoomBooking = z.infer<typeof CreateRoomBookingSchema>;
export type UpdateRoomBooking = z.infer<typeof UpdateRoomBookingSchema>;
