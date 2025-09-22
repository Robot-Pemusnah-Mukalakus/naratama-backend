import express from "express";
import prisma from "../lib/prisma.js";

const router = express.Router();

// GET /api/announcements
router.get("/", async (req, res) => {
  try {
    const { type, priority, targetAudience, page = 1, limit = 20 } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = { isActive: true };

    if (type) where.type = type;
    if (priority) where.priority = priority;
    if (targetAudience) where.targetAudience = targetAudience;

    const [announcements, total] = await Promise.all([
      prisma.announcement.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNum,
      }),
      prisma.announcement.count({ where }),
    ]);

    res.json({
      success: true,
      count: announcements.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      data: announcements,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch announcements",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// GET /api/announcements/:id
router.get("/:id", async (req, res) => {
  try {
    const announcement = await prisma.announcement.findUnique({
      where: { id: req.params.id },
    });

    if (!announcement || !announcement.isActive) {
      return res.status(404).json({
        success: false,
        message: "Announcement not found",
      });
    }

    res.json({
      success: true,
      data: announcement,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch announcement",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// POST /api/announcements
router.post("/", async (req, res) => {
  try {
    const {
      title,
      content,
      type,
      priority = "medium",
      createdBy,
      targetAudience = "all",
    } = req.body;

    // Validate required fields
    if (!title || !content || !type || !createdBy) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    const announcement = await prisma.announcement.create({
      data: {
        title,
        content,
        type,
        priority,
        createdBy,
        targetAudience,
      },
    });

    res.status(201).json({
      success: true,
      message: "Announcement created successfully",
      data: announcement,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Failed to create announcement",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// PUT /api/announcements/:id
router.put("/:id", async (req, res) => {
  try {
    const updateData: any = {};
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
        updateData[field] = req.body[field];
      }
    });

    const announcement = await prisma.announcement.update({
      where: { id: req.params.id },
      data: updateData,
    });

    res.json({
      success: true,
      message: "Announcement updated successfully",
      data: announcement,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("Record to update not found")
    ) {
      return res.status(404).json({
        success: false,
        message: "Announcement not found",
      });
    }

    res.status(400).json({
      success: false,
      message: "Failed to update announcement",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// DELETE /api/announcements/:id
router.delete("/:id", async (req, res) => {
  try {
    await prisma.announcement.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });

    res.json({
      success: true,
      message: "Announcement deleted successfully",
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("Record to update not found")
    ) {
      return res.status(404).json({
        success: false,
        message: "Announcement not found",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to delete announcement",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
