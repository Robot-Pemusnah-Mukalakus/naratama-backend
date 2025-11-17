import { Prisma, UserRole } from "@prisma/client";
import express from "express";

import prisma from "../lib/prisma.js";
import { checkAdmin, checkAuth, checkStaff } from "../middleware/auth.js";
import { validateSchema } from "../middleware/validation.js";
import { createTransactionMembership } from "../config/midtrans.js";
import { MembershipPaymentSchema } from "../validations/membership.js";
import { generateTimestampCode } from "../utils/random.js";

const router = express.Router();

export function generateMembershipNumber(): string {
  return `mbr-${generateTimestampCode()}`;
}

// GET /api/users
router.get("/", checkStaff, async (req, res) => {
  try {
    const { isActive, isMember } = req.query;
    const where: Prisma.UserWhereInput = {};

    if (isActive !== undefined) where.isActive = isActive === "true";

    // Filter by membership status
    if (isMember !== undefined) {
      const isMemberBool = isMember === "true";
      if (isMemberBool) {
        where.membership = {
          endDate: {
            gte: new Date(), // only active memberships
          },
          isActive: true,
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
      include: {
        membership: true,
      },
      orderBy: { createdAt: "desc" },
      where,
    });

    res.json({
      count: users.length,
      data: users,
      success: true,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
      message: "Failed to fetch users",
      success: false,
    });
  }
});

// GET /api/users/me
router.get("/me", checkAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      include: {
        membership: true,
      },
      where: { id: req.user?.id },
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }

    // Remove password from response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithoutPassword } = user;

    res.json({
      data: userWithoutPassword,
      success: true,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
      message: "Failed to fetch user profile",
      success: false,
    });
  }
});

// GET /api/users/:id
router.get("/:id", checkAuth, async (req, res) => {
  try {
    const requestingUser = req.user;
    const targetUserId = req.params.id;

    if (!requestingUser) {
      return res.status(401).json({
        message: "Unauthorized",
        success: false,
      });
    }

    // Check if user is trying to view their own profile or if they're staff/admin
    const isOwnProfile = requestingUser.id === targetUserId;
    const isStaffOrAdmin =
      requestingUser.role === UserRole.STAFF ||
      requestingUser.role === UserRole.ADMIN;

    if (!isOwnProfile && !isStaffOrAdmin) {
      return res.status(403).json({
        message: "You can only view your own profile or must be staff/admin",
        success: false,
      });
    }

    const user = await prisma.user.findUnique({
      include: {
        membership: true,
      },
      where: { id: req.params.id },
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }

    // remove password from response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithoutPassword } = user;

    res.json({
      data: userWithoutPassword,
      success: true,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
      message: "Failed to fetch user",
      success: false,
    });
  }
});

// GET /api/users/email/:email
router.get("/email/:email", checkStaff, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { email: req.params.email },
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }

    res.json({
      data: user,
      success: true,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
      message: "Failed to fetch user",
      success: false,
    });
  }
});

// POST /api/users
// router.post("/", checkStaff, async (req, res) => {
//   try {
//     const { name, phoneNumber, email } = req.body;

//     // validate required fields
//     if (!name || !phoneNumber || !email) {
//       return res.status(400).json({
//         success: false,
//         message: "Name, phone number, and email are required",
//       });
//     }

//     // check if phone number already exists
//     const existingUser = await prisma.user.findUnique({
//       where: { phoneNumber },
//     });

//     if (existingUser) {
//       return res.status(400).json({
//         success: false,
//         message: "Phone number already exists",
//       });
//     }

//     const userData: any = {
//       name,
//       phoneNumber,
//       email: email || undefined,
//     };

//     const user = await prisma.user.create({
//       data: userData,
//     });

//     res.status(201).json({
//       success: true,
//       message: "User created successfully",
//       data: user,
//     });
//   } catch (error) {
//     if (error instanceof Error && error.message.includes("Unique constraint")) {
//       return res.status(400).json({
//         success: false,
//         message: "Phone number already exists",
//       });
//     }

//     res.status(400).json({
//       success: false,
//       message: "Failed to create user",
//       error: error instanceof Error ? error.message : "Unknown error",
//     });
//   }
// });

// PUT /api/users/:id
router.put("/:id", checkAuth, async (req, res) => {
  try {
    const { email, name } = req.body as Prisma.UserUpdateInput;
    const requestingUser = req.user;
    const targetUserId = req.params.id;

    if (!requestingUser) {
      return res.status(401).json({
        message: "Unauthorized",
        success: false,
      });
    }

    // check if user is trying to update their own profile or if they're staff/admin
    const isOwnProfile = requestingUser.id === targetUserId;
    const isStaffOrAdmin =
      requestingUser.role === UserRole.STAFF ||
      requestingUser.role === UserRole.ADMIN;

    if (!isOwnProfile && !isStaffOrAdmin) {
      return res.status(403).json({
        message: "You can only update your own profile or must be staff/admin",
        success: false,
      });
    }

    const updateData: Prisma.UserUpdateInput = {};
    if (name) updateData.name = name;
    if (email !== undefined) updateData.email = email;

    const user = await prisma.user.update({
      data: updateData,
      where: { id: req.params.id },
    });

    res.json({
      data: user,
      message: "User updated successfully",
      success: true,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("Record to update not found")
    ) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }

    res.status(400).json({
      error: error instanceof Error ? error.message : "Unknown error",
      message: "Failed to update user",
      success: false,
    });
  }
});

// PUT /api/users/:id/membership
router.put("/:id/membership", checkStaff, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      include: {
        membership: true,
      },
      where: { id: req.params.id },
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }

    const now = new Date();
    const thirtyDaysFromNow = new Date(
      now.getTime() + 30 * 24 * 60 * 60 * 1000
    );

    if (
      user.membership &&
      user.membership.isActive &&
      user.membership.endDate > now
    ) {
      // Extend existing active membership by 30 days
      const newEndDate = new Date(
        user.membership.endDate.getTime() + 30 * 24 * 60 * 60 * 1000
      );

      await prisma.membership.update({
        data: {
          endDate: newEndDate,
        },
        where: { id: user.membership.id },
      });
    } else {
      // Create new membership or reactivate expired one
      const membershipNumber =
        user.membership?.membershipNumber ?? generateMembershipNumber();

      if (user.membership) {
        // Reactivate existing membership
        await prisma.membership.update({
          data: {
            endDate: thirtyDaysFromNow,
            isActive: true,
            startDate: now,
          },
          where: { id: user.membership.id },
        });
      } else {
        // Create new membership
        await prisma.membership.create({
          data: {
            endDate: thirtyDaysFromNow,
            isActive: true,
            membershipNumber,
            startDate: now,
            userId: user.id,
          },
        });
      }
    }

    // Get updated user with membership
    const updatedUser = await prisma.user.findUnique({
      include: {
        membership: true,
      },
      where: { id: req.params.id },
    });

    res.json({
      data: updatedUser,
      message:
        user.membership &&
        user.membership.isActive &&
        user.membership.endDate > now
          ? "Membership extended by 30 days"
          : "Membership activated for 30 days",
      success: true,
    });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : "Unknown error",
      message: "Failed to update membership status",
      success: false,
    });
  }
});

// DELETE /api/users/:id/membership
router.delete("/:id/membership", checkStaff, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      include: {
        membership: true,
      },
      where: { id: req.params.id },
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }

    if (!user.membership) {
      return res.status(400).json({
        message: "User does not have an active membership",
        success: false,
      });
    }

    // Deactivate membership
    await prisma.membership.update({
      data: {
        endDate: new Date(), // Set end date to now
        isActive: false,
      },
      where: { id: user.membership.id },
    });

    // Get updated user
    const updatedUser = await prisma.user.findUnique({
      include: {
        membership: true,
      },
      where: { id: req.params.id },
    });

    res.json({
      data: updatedUser,
      message: "Membership deactivated successfully",
      success: true,
    });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : "Unknown error",
      message: "Failed to deactivate membership",
      success: false,
    });
  }
});

// DELETE /api/users/:id
router.delete("/:id", checkAdmin, async (req, res) => {
  try {
    const user = await prisma.user.update({
      data: { isActive: false },
      where: { id: req.params.id },
    });

    res.json({
      message: `User deleted successfully with data: ${JSON.stringify(user)}`,
      success: true,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("Record to update not found")
    ) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }

    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
      message: "Failed to deactivate user",
      success: false,
    });
  }
});

export default router;
