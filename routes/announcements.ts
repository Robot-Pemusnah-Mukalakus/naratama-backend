/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import prisma from "#lib/prisma.js";
import { AnnouncementType, Audience, Priority, Prisma } from "@prisma/client";
import express from "express";

const router = express.Router();

// GET /api/announcements
router.get("/", async (req, res) => {
  try {
    const { limit = 20, page = 1, priority, targetAudience, type } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: Prisma.AnnouncementWhereInput = { isActive: true };

    if (type) where.type = type as AnnouncementType;
    if (priority) where.priority = priority as Priority;
    if (targetAudience) where.targetAudience = targetAudience as Audience;

    const [announcements, total] = await Promise.all([
      prisma.announcement.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNum,
        where,
      }),
      prisma.announcement.count({ where }),
    ]);

    res.json({
      count: announcements.length,
      data: announcements,
      page: pageNum,
      success: true,
      total,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
      message: "Failed to fetch announcements",
      success: false,
    });
  }
});

// GET /api/announcements/:id
router.get("/:id", async (req, res) => {
  try {
    const announcement = await prisma.announcement.findUnique({
      where: { id: req.params.id },
    });

    if (!announcement?.isActive) {
      return res.status(404).json({
        message: "Announcement not found",
        success: false,
      });
    }

    res.json({
      data: announcement,
      success: true,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
      message: "Failed to fetch announcement",
      success: false,
    });
  }
});

// POST /api/announcements
router.post("/", async (req, res) => {
  try {
    const {
      content,
      createdBy,
      priority = "medium",
      targetAudience = "all",
      title,
      type,
    } = req.body as Prisma.AnnouncementCreateInput;

    // Validate required fields
    if (!title || !content || !type || !createdBy) {
      return res.status(400).json({
        message: "Missing required fields",
        success: false,
      });
    }

    const announcement = await prisma.announcement.create({
      data: {
        content,
        createdBy,
        priority: priority as Priority,
        targetAudience: targetAudience as Audience,
        title,
        type,
      },
    });

    res.status(201).json({
      data: announcement,
      message: "Announcement created successfully",
      success: true,
    });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : "Unknown error",
      message: "Failed to create announcement",
      success: false,
    });
  }
});

// PUT /api/announcements/:id
router.put("/:id", async (req, res) => {
  try {
    const updateData: Prisma.AnnouncementUpdateInput = {};
    const allowedFields = [
      "title",
      "content",
      "type",
      "priority",
      "targetAudience",
    ];

    // Only include allowed fields in update
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        (updateData as Record<typeof field, unknown>)[
          field as keyof Prisma.AnnouncementUpdateInput
        ] = req.body[field];
      }
    });

    const announcement = await prisma.announcement.update({
      data: updateData,
      where: { id: req.params.id },
    });

    res.json({
      data: announcement,
      message: "Announcement updated successfully",
      success: true,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("Record to update not found")
    ) {
      return res.status(404).json({
        message: "Announcement not found",
        success: false,
      });
    }

    res.status(400).json({
      error: error instanceof Error ? error.message : "Unknown error",
      message: "Failed to update announcement",
      success: false,
    });
  }
});

// DELETE /api/announcements/:id
router.delete("/:id", async (req, res) => {
  try {
    await prisma.announcement.update({
      data: { isActive: false },
      where: { id: req.params.id },
    });

    res.json({
      message: "Announcement deleted successfully",
      success: true,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("Record to update not found")
    ) {
      return res.status(404).json({
        message: "Announcement not found",
        success: false,
      });
    }

    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
      message: "Failed to delete announcement",
      success: false,
    });
  }
});

export default router;
