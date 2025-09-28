import { mongoId } from "#utils/validation.js";
import { z } from "zod";

// ============================
// ENUMS
// ============================
export const RoomTypeSchema = z.enum(["SMALL_DISCUSSION", "LARGE_MEETING"]);

// ============================
// USER SCHEMAS
// ============================
export const CreateRoomSchema = z.object({
  amenities: z.array(z.string().max(50, "Amenity name too long")).optional(),
  capacity: z
    .number()
    .int()
    .min(1, "Capacity must be at least 1")
    .max(100, "Capacity too high"),
  description: z.string().max(500, "Description too long").optional(),
  hourlyRate: z.number().min(0, "Hourly rate cannot be negative"),
  name: z
    .string()
    .min(1, "Room name is required")
    .max(100, "Room name too long"),
  roomNumber: z
    .string()
    .min(1, "Room number is required")
    .max(10, "Room number too long"),
  type: RoomTypeSchema,
});

export const GetRoomQuerySchema = z.object({
  available: z
    .enum(["true", "false"], {
      error: "Available must be 'true' or 'false'",
    })
    .optional(),
  type: RoomTypeSchema.optional(),
});

export const RoomIdParamSchema = z.object({
  roomId: mongoId,
});

export const RoomQuerySchema = z.object({
  date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid date format",
  }),
});

export const UpdateRoomSchema = z.object({
  amenities: z.array(z.string().max(50, "Amenity name too long")).optional(),
  capacity: z
    .number()
    .int()
    .min(1, "Capacity must be at least 1")
    .max(100, "Capacity too high")
    .optional(),
  description: z.string().max(500, "Description too long").optional(),
  hourlyRate: z.number().min(0, "Hourly rate cannot be negative").optional(),
  isAvailable: z.boolean().optional(),
  name: z
    .string()
    .min(1, "Room name is required")
    .max(100, "Room name too long")
    .optional(),
  roomNumber: z
    .string()
    .min(1, "Room number is required")
    .max(10, "Room number too long")
    .optional(),
  type: RoomTypeSchema.optional(),
});

// ============================
// EXPORT TYPES
// ============================
export type CreateRoom = z.infer<typeof CreateRoomSchema>;
export type UpdateRoom = z.infer<typeof UpdateRoomSchema>;
