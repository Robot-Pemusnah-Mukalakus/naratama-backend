import express from "express";
import prisma from "../lib/prisma.js";
import { UserRole } from "@prisma/client";
import {
  checkAuth,
  checkStaff,
  checkAdmin,
  optionalAuth,
} from "../middleware/auth.js";
import { validateSchema, validateMultiple } from "../middleware/validation.js";
import {
  CreateUserSchema,
  UpdateUserSchema,
  CreateMembershipSchema,
  IdParamSchema,
} from "../schemas/index.js";

const router = express.Router();

// Helper function to generate membership number
async function generateMembershipNumber(): Promise<string> {
  const count = await prisma.membership.count();
  return `NRT${String(count + 1).padStart(4, "0")}`;
}

// GET /api/users
router.get("/", checkStaff, async (req, res) => {
  try {
    const { isMember, isActive } = req.query;
    const where: any = {};

    if (isActive !== undefined) where.isActive = isActive === "true";

    // Filter by membership status
    if (isMember !== undefined) {
      const isMemberBool = isMember === "true";
      if (isMemberBool) {
        where.membership = {
          isActive: true,
          endDate: {
            gte: new Date(), // only active memberships
          },
        };
      } else {
        where.OR = [
          { membership: null },
          {
            membership: {
              OR: [{ isActive: false }, { endDate: { lt: new Date() } }],
            },
          },
        ];
      }
    }

    const users = await prisma.user.findMany({
      where,
      include: {
        membership: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// GET /api/users/me
router.get("/me", checkAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: {
        membership: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Remove password from response
    const { password, ...userWithoutPassword } = user;

    res.json({
      success: true,
      data: userWithoutPassword,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch user profile",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// GET /api/users/:id
router.get("/:id", checkAuth, async (req, res) => {
  try {
    const requestingUser = req.user!;
    const targetUserId = req.params.id;

    // Check if user is trying to view their own profile or if they're staff/admin
    const isOwnProfile = requestingUser.id === targetUserId;
    const isStaffOrAdmin =
      requestingUser.role === UserRole.STAFF ||
      requestingUser.role === UserRole.ADMIN;

    if (!isOwnProfile && !isStaffOrAdmin) {
      return res.status(403).json({
        success: false,
        message: "You can only view your own profile or must be staff/admin",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: {
        membership: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // remove password from response
    const { password, ...userWithoutPassword } = user;

    res.json({
      success: true,
      data: userWithoutPassword,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch user",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// GET /api/users/phone/:phoneNumber
router.get("/phone/:phoneNumber", checkStaff, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { phoneNumber: req.params.phoneNumber },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch user",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// POST /api/users
router.post("/", checkStaff, async (req, res) => {
  try {
    const { name, phoneNumber, email, isMember } = req.body;

    // validate required fields
    if (!name || !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "Name and phone number are required",
      });
    }

    // check if phone number already exists
    const existingUser = await prisma.user.findUnique({
      where: { phoneNumber },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Phone number already exists",
      });
    }

    const userData: any = {
      name,
      phoneNumber,
      email: email || undefined,
    };

    const user = await prisma.user.create({
      data: userData,
    });

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: user,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return res.status(400).json({
        success: false,
        message: "Phone number already exists",
      });
    }

    res.status(400).json({
      success: false,
      message: "Failed to create user",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// PUT /api/users/:id
router.put("/:id", checkAuth, async (req, res) => {
  try {
    const { name, email, isMember } = req.body;
    const requestingUser = req.user!;
    const targetUserId = req.params.id;

    // check if user is trying to update their own profile or if they're staff/admin
    const isOwnProfile = requestingUser.id === targetUserId;
    const isStaffOrAdmin =
      requestingUser.role === UserRole.STAFF ||
      requestingUser.role === UserRole.ADMIN;

    if (!isOwnProfile && !isStaffOrAdmin) {
      return res.status(403).json({
        success: false,
        message: "You can only update your own profile or must be staff/admin",
      });
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (email !== undefined) updateData.email = email;

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: updateData,
    });

    res.json({
      success: true,
      message: "User updated successfully",
      data: user,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("Record to update not found")
    ) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(400).json({
      success: false,
      message: "Failed to update user",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// PUT /api/users/:id/membership
router.put("/:id/membership", checkStaff, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: {
        membership: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const now = new Date();
    const thirtyDaysFromNow = new Date(
      now.getTime() + 30 * 24 * 60 * 60 * 1000
    );

    let membershipData;

    if (
      user.membership &&
      user.membership.isActive &&
      user.membership.endDate > now
    ) {
      // Extend existing active membership by 30 days
      const newEndDate = new Date(
        user.membership.endDate.getTime() + 30 * 24 * 60 * 60 * 1000
      );

      membershipData = await prisma.membership.update({
        where: { id: user.membership.id },
        data: {
          endDate: newEndDate,
        },
      });
    } else {
      // Create new membership or reactivate expired one
      const membershipNumber =
        user.membership?.membershipNumber || (await generateMembershipNumber());

      if (user.membership) {
        // Reactivate existing membership
        membershipData = await prisma.membership.update({
          where: { id: user.membership.id },
          data: {
            startDate: now,
            endDate: thirtyDaysFromNow,
            isActive: true,
          },
        });
      } else {
        // Create new membership
        membershipData = await prisma.membership.create({
          data: {
            userId: user.id,
            membershipNumber,
            startDate: now,
            endDate: thirtyDaysFromNow,
            isActive: true,
          },
        });
      }
    }

    // Get updated user with membership
    const updatedUser = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: {
        membership: true,
      },
    });

    res.json({
      success: true,
      message:
        user.membership &&
        user.membership.isActive &&
        user.membership.endDate > now
          ? "Membership extended by 30 days"
          : "Membership activated for 30 days",
      data: updatedUser,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Failed to update membership status",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// DELETE /api/users/:id/membership
router.delete("/:id/membership", checkStaff, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: {
        membership: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!user.membership) {
      return res.status(400).json({
        success: false,
        message: "User does not have an active membership",
      });
    }

    // Deactivate membership
    await prisma.membership.update({
      where: { id: user.membership.id },
      data: {
        isActive: false,
        endDate: new Date(), // Set end date to now
      },
    });

    // Get updated user
    const updatedUser = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: {
        membership: true,
      },
    });

    res.json({
      success: true,
      message: "Membership deactivated successfully",
      data: updatedUser,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Failed to deactivate membership",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// DELETE /api/users/:id
router.delete("/:id", checkAdmin, async (req, res) => {
  try {
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });

    res.json({
      success: true,
      message: "User deactivated successfully",
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("Record to update not found")
    ) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to deactivate user",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
