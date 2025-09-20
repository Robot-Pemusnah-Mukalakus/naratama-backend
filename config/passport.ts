import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcrypt";
import prisma from "../lib/prisma.js";
import { UserRole } from "@prisma/client";
import { SessionUser } from "../middleware/auth.js";

// Configure Local Strategy
passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    async (email: string, password: string, done) => {
      try {
        const user = await prisma.user.findUnique({
          where: { email },
          include: { membership: true },
        });

        if (!user) {
          return done(null, false, {
            message: "Invalid phone number or password",
          });
        }

        if (!user.password) {
          return done(null, false, {
            message: "Account not activated. Please set a password first.",
          });
        }

        if (!user.isActive) {
          return done(null, false, { message: "Account is deactivated" });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
          return done(null, false, {
            message: "Invalid email or password",
          });
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLogin: new Date() },
        });

        const sessionUser: SessionUser = {
          id: user.id,
          name: user.name,
          phoneNumber: user.phoneNumber,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          lastLogin: new Date(),
          membership: user.membership,
        };

        return done(null, sessionUser);
      } catch (error) {
        console.error("Authentication error:", error);
        return done(error);
      }
    }
  )
);

// serialize user for session storage
passport.serializeUser((user: Express.User, done) => {
  done(null, user.id);
});

// deserialize user from session
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        membership: true,
      },
    });

    if (!user || !user.isActive) {
      return done(null, false);
    }

    // Membership check
    const now = new Date();
    const hasActiveMembership =
      user.membership &&
      user.membership.isActive &&
      user.membership.endDate > now;

    const sessionUser: SessionUser = {
      id: user.id,
      name: user.name,
      phoneNumber: user.phoneNumber,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      lastLogin: user.lastLogin || null,
      membership: user.membership,
    };

    done(null, sessionUser);
  } catch (error) {
    console.error("Deserialization error:", error);
    done(error);
  }
});

export default passport;