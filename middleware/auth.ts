import { UserRole } from "@prisma/client";
import { User as UserDBType } from "@prisma/client";
import { Membership } from "@prisma/client";
import { NextFunction, Request, Response } from "express";

// User interface for sessions
export type SessionUser = Omit<
  UserDBType,
  "createdAt" | "joinDate" | "password" | "updatedAt"
> & {
  membership: Membership | null;
};

declare module "express-serve-static-core" {
  interface Request {
    user?: SessionUser;
  }
}

// Check if user is authenticated
export const checkAuth = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    next();
    return;
  }
  return res.status(401).json({
    message: "Authentication required",
    success: false,
  });
};

// Optional authentication (user can be authenticated or not)
export const optionalAuth = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Always proceed, but user might not be authenticated
  next();
};

// Check if user is staff or admin
export const checkStaff = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({
      message: "Authentication required",
      success: false,
    });
  }

  const user = req.user;
  if (user.role !== UserRole.STAFF && user.role !== UserRole.ADMIN) {
    return res.status(403).json({
      message: "Staff access required",
      success: false,
    });
  }

  next();
};

// Check if user is admin
export const checkAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({
      message: "Authentication required",
      success: false,
    });
  }

  const user = req.user;
  if (user.role !== UserRole.ADMIN) {
    return res.status(403).json({
      message: "Admin access required",
      success: false,
    });
  }
  next();
};

export const checkStaffOrAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({
      message: "Authentication required",
      success: false,
    });
  }

  const user = req.user;
  if (user.role !== UserRole.STAFF && user.role !== UserRole.ADMIN) {
    return res.status(403).json({
      message: "Staff or Admin access required",
      success: false,
    });
  }
  next();
};
