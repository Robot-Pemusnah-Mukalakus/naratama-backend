/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-misused-promises */
import bcrypt from "bcrypt";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Profile } from "passport-google-oauth20";
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
          isOauthUser: user.isOauthUser,
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

// Configure Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      callbackURL:
        process.env.GOOGLE_CALLBACK_URL ??
        "http://localhost:8080/api/auth/google/callback",
      clientID: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    },
    async (_accessToken, _refreshToken, profile: Profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) {
          return done(null, false, { message: "No email found from Google" });
        }

        // Look for user by email
        let user = await prisma.user.findUnique({
          include: { membership: true },
          where: { email },
        });

        // If not found, create new account
        user ??= await prisma.user.create({
          data: {
            email,
            isOauthUser: true,
            name: profile.displayName ?? "Unnamed User",
            password: "", // leave blank since OAuth user doesn’t use local password
            phoneNumber: "",
          },
          include: { membership: true },
        });

        let googleUser = await prisma.googleUser.findUnique({
          where: { googleId: profile.id },
        });

        googleUser ??= await prisma.googleUser.create({
          data: {
            email: user.email,
            googleId: profile.id,
            name:
              profile.displayName ?? profile.name?.givenName ?? "Unnamed User",
            userId: user.id,
          },
        });

        // Build session object
        const sessionUser: SessionUser = {
          email: user.email,
          id: user.id,
          isActive: user.isActive,
          isOauthUser: user.isOauthUser,
          lastLogin: new Date(user.lastLogin ?? Date.now()),
          membership: user.membership,
          name: user.name,
          phoneNumber: user.phoneNumber,
          role: user.role,
        };

        // Update last login
        await prisma.user.update({
          data: { lastLogin: new Date() },
          where: { id: user.id },
        });

        return done(null, sessionUser);
      } catch (err) {
        console.error("Google auth error:", err);
        return done(err);
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
      isOauthUser: user.isOauthUser,
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
