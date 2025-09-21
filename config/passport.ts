/* eslint-disable @typescript-eslint/no-misused-promises */
import bcrypt from "bcrypt";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";

import prisma from "../lib/prisma.js";
import { SessionUser } from "../middleware/auth.js";

// Configure Local Strategy
passport.use(
  new LocalStrategy(
    {
      passwordField: "password",
      usernameField: "email",
    },
    async (email: string, password: string, done) => {
      try {
        const user = await prisma.user.findUnique({
          include: { membership: true },
          where: { email },
        });

        if (!user) {
          done(null, false, {
            message: "Invalid phone number or password",
          });
          return;
        }

        if (!user.password) {
          done(null, false, {
            message: "Account not activated. Please set a password first.",
          });
          return;
        }

        if (!user.isActive) {
          done(null, false, { message: "Account is deactivated" });
          return;
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
          done(null, false, {
            message: "Invalid email or password",
          });
          return;
        }

        await prisma.user.update({
          data: { lastLogin: new Date() },
          where: { id: user.id },
        });

        const sessionUser: SessionUser = {
          email: user.email,
          id: user.id,
          isActive: user.isActive,
          lastLogin: new Date(),
          membership: user.membership,
          name: user.name,
          phoneNumber: user.phoneNumber,
          role: user.role,
        };

        done(null, sessionUser);
        return;
      } catch (error) {
        console.error("Authentication error:", error);
        done(error);
        return;
      }
    }
  )
);

// serialize user for session storage
passport.serializeUser((user: Express.User, done) => {
  done(null, (user as SessionUser).id);
});

// deserialize user from session
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.user.findUnique({
      include: {
        membership: true,
      },
      where: { id },
    });

    if (!user || !user.isActive) {
      done(null, false);
      return;
    }

    const sessionUser: SessionUser = {
      email: user.email,
      id: user.id,
      isActive: user.isActive,
      lastLogin: new Date(user.lastLogin ?? Date.now()),
      membership: user.membership,
      name: user.name,
      phoneNumber: user.phoneNumber,
      role: user.role,
    };

    done(null, sessionUser);
  } catch (error) {
    console.error("Deserialization error:", error);
    done(error);
  }
});

export default passport;
