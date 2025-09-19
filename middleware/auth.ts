import { Request, Response, NextFunction } from "express";
import { UserRole } from "@prisma/client";
import { User as UserDBType } from "@prisma/client";
import { Membership } from "@prisma/client";

// User interface
export type SessionUser = Omit<
  UserDBType,
  "password" | "joinDate" | "createdAt" | "updatedAt"
> & {
  membership: Membership | null;
};


declare global {
  namespace Express {
    interface User extends SessionUser {}
  }
}

// Auth Check
export const checkAuth = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({
    success: false,
    message: "Authentication required",
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

// Staff check
export const checkStaff = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  const user = req.user;
  if (!user || (user.role !== UserRole.STAFF && user.role !== UserRole.ADMIN)) {
    return res.status(403).json({
      success: false,
      message: "Staff access required",
    });
  }

  next();
};

// Admin check
export const checkAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  const user = req.user;
  if (!user || user.role !== UserRole.ADMIN) {
    return res.status(403).json({
      success: false,
      message: "Admin access required",
    });
  }

  next();
};