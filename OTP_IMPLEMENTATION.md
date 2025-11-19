# OTP Email Verification Implementation

## Overview

This implementation adds email verification using OTP (One-Time Password) to the user registration process. Users must verify their email address before they can access the system.

## Changes Made

### 1. Database Schema (`prisma/schema.prisma`)

Added new fields to the User model:

- `otp`: String? - Stores the generated 6-digit OTP
- `otpExpiry`: DateTime? - Stores when the OTP expires (10 minutes from generation)
- `isEmailVerified`: Boolean @default(false) - Tracks if user's email is verified

### 2. OTP Utilities (`utils/otp.ts`)

Created utility functions for OTP management:

- `generateOTP()`: Generates a random 6-digit OTP
- `sendOTPEmail(email, otp, name?)`: Sends OTP via SMTP email
- `isOTPExpired(otpExpiry)`: Checks if OTP has expired
- `getOTPExpiry()`: Returns expiry time (current time + 10 minutes)

### 3. Validation Schemas (`validations/auth.ts`)

Added `VerifyOTPSchema` for validating OTP input:

- email: Required email address
- otp: Required 6-digit numeric code

### 4. Authentication Routes (`routes/auth.ts`)

#### Modified `/register` endpoint:

- No longer creates active user immediately
- Generates OTP and stores it with the user record
- Sends OTP via email
- Creates user with `isActive: false` and `isEmailVerified: false`
- If user exists but is not verified, updates their OTP for resend

#### New `/verify-otp` endpoint:

- Accepts email and OTP
- Validates OTP matches and hasn't expired
- Marks user as verified (`isEmailVerified: true`)
- Activates user account (`isActive: true`)
- Auto-logs in the user after successful verification

### 5. Middleware (`middleware/auth.ts`)

Updated `SessionUser` type to exclude OTP-related fields from session storage.

### 6. Passport Configuration (`config/passport.ts`)

- Updated all `SessionUser` constructions to include `isEmailVerified` field
- OAuth users are automatically marked as verified

## API Flow

### Registration Flow

1. User submits registration form (POST `/api/auth/register`)

   ```json
   {
     "email": "user@example.com",
     "name": "John Doe",
     "password": "securePassword123",
     "phoneNumber": "+1234567890"
   }
   ```

2. Backend:
   - Validates input
   - Checks if user exists and is verified
   - Generates 6-digit OTP
   - Hashes password
   - Creates/updates user with OTP (inactive state)
   - Sends OTP email

3. Response:
   ```json
   {
     "success": true,
     "message": "Registration initiated. Please check your email for the OTP code."
   }
   ```

### Verification Flow

1. User submits OTP (POST `/api/auth/verify-otp`)

   ```json
   {
     "email": "user@example.com",
     "otp": "123456"
   }
   ```

2. Backend:
   - Validates OTP format
   - Checks if user exists
   - Verifies OTP matches
   - Checks OTP hasn't expired (10 min validity)
   - Activates user account
   - Auto-logs in user

3. Response:
   ```json
   {
     "success": true,
     "message": "Email verified and logged in successfully",
     "user": { ...sessionUser }
   }
   ```

## Environment Variables

Update your `.env` file with SMTP configuration:

```env
# SMTP Configuration for Email Verification
SMTP_HOST="smtp.gmail.com"              # Your SMTP server
SMTP_PORT=587                           # SMTP port (usually 587 for TLS)
SMTP_USER="your-email@gmail.com"        # Your email address
SMTP_PASSWORD="your-16-char-app-pass"   # Your Gmail App Password (no spaces)

# For Gmail: Use an App Password instead of your regular password
# Generate at: https://myaccount.google.com/apppasswords
```

### Gmail Setup

1. Enable 2-Factor Authentication on your Google Account
2. Go to https://myaccount.google.com/apppasswords
3. Create a new App Password for "Mail"
4. Use that 16-character password as `SMTP_KEY`

## Security Features

- OTP expires after 10 minutes
- User account remains inactive until verified
- Password is hashed before storage
- OTP is cleared from database after verification
- Existing unverified users can request new OTP

## Error Handling

- 404: User not found
- 400: Email already verified
- 401: Invalid or expired OTP
- 409: User already exists (verified)
- 500: Server/SMTP errors

## Testing

Test the implementation:

1. Register a new user
2. Check email for 6-digit OTP
3. Submit OTP within 10 minutes
4. User should be logged in automatically

## Dependencies Added

- `nodemailer`: ^7.x.x (for sending emails)
- `@types/nodemailer`: ^6.x.x (TypeScript types)
