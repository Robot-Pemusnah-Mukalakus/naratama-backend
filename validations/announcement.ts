import { dateInFuture, dateInNowOrPast, mongoId } from "#utils/validation.js";
import { z } from "zod";

// ============================
// ENUMS
// ============================
export const AnnouncementTypeSchema = z.enum([
  "NEW_BOOKS",
  "EVENT",
  "MAINTENANCE",
  "POLICY",
  "GENERAL",
]);
export const PrioritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);
export const AudienceSchema = z.enum(["ALL", "MEMBERS_ONLY", "STAFF"]);

// ============================
// USER SCHEMAS
// ============================
export const CreateAnnouncementSchema = z.object({
  attachments: z.array(z.url("Invalid attachment URL")).optional(),
  content: z
    .string()
    .min(1, "Content is required")
    .max(2000, "Content too long"),
  createdBy: mongoId,
  expiryDate: dateInFuture.optional(),
  priority: PrioritySchema.optional(),
  publishDate: dateInNowOrPast.optional(),
  targetAudience: AudienceSchema.optional(),
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  type: AnnouncementTypeSchema.optional(),
});

export const UpdateAnnouncementSchema = z.object({
  attachments: z.array(z.url("Invalid attachment URL")).optional(),
  content: z
    .string()
    .min(1, "Content is required")
    .max(2000, "Content too long")
    .optional(),
  expiryDate: dateInFuture.optional(),
  isActive: z.boolean().optional(),
  priority: PrioritySchema.optional(),
  publishDate: dateInNowOrPast.optional(),
  targetAudience: AudienceSchema.optional(),
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title too long")
    .optional(),
  type: AnnouncementTypeSchema.optional(),
});

// ============================
// EXPORT TYPES
// ============================
export type CreateAnnouncement = z.infer<typeof CreateAnnouncementSchema>;
export type UpdateAnnouncement = z.infer<typeof UpdateAnnouncementSchema>;
