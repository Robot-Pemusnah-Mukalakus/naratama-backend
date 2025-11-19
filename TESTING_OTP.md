# Testing OTP Email Verification

## Quick Test Guide

### Prerequisites

1. Configure SMTP settings in `.env`:

   ```env
   SMTP_HOST="smtp.gmail.com"
   SMTP_PORT=587
   SMTP_USER="your-email@gmail.com"
   SMTP_PASSWORD="your-app-password-here"
   ```

2. For Gmail users:
   - Enable 2FA on your Google Account
   - Generate App Password: https://myaccount.google.com/apppasswords
   - Use the 16-character App Password as SMTP_PASSWORD (remove spaces)

### Test Steps

#### 1. Register a New User

```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "name": "Test User",
    "password": "SecurePass123!",
    "phoneNumber": "+1234567890"
  }'
```

**Expected Response:**

```json
{
  "success": true,
  "message": "Registration initiated. Please check your email for the OTP code."
}
```

#### 2. Check Email

- Check the inbox of the email you registered with
- You should receive an email from Naratama Library
- The email contains a 6-digit OTP code
- The OTP is valid for 10 minutes

#### 3. Verify OTP

```bash
curl -X POST http://localhost:8080/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "otp": "123456"
  }'
```

**Expected Response (Success):**

```json
{
  "success": true,
  "message": "Email verified and logged in successfully",
  "user": {
    "id": "...",
    "email": "test@example.com",
    "name": "Test User",
    "role": "USER",
    "isActive": true,
    "isEmailVerified": true,
    ...
  }
}
```

### Error Scenarios

#### Invalid OTP

```bash
# Using wrong OTP
curl -X POST http://localhost:8080/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "otp": "000000"}'
```

**Response:**

```json
{
  "success": false,
  "message": "Invalid OTP code"
}
```

#### Expired OTP (after 10 minutes)

```json
{
  "success": false,
  "message": "OTP code has expired. Please request a new one."
}
```

#### User Already Verified

```json
{
  "success": false,
  "message": "Email already verified. Please login."
}
```

### Resending OTP

If the OTP expires or the user didn't receive it, they can simply call the register endpoint again with the same email:

```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "name": "Test User",
    "password": "SecurePass123!",
    "phoneNumber": "+1234567890"
  }'
```

This will generate and send a new OTP to the same email address.

## Frontend Integration Example

### React/Next.js Example

```typescript
// Registration
const handleRegister = async (formData) => {
  const response = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(formData),
  });

  const data = await response.json();

  if (data.success) {
    // Show OTP input form
    setShowOTPInput(true);
    setMessage("Please check your email for the OTP code");
  } else {
    setError(data.message);
  }
};

// OTP Verification
const handleVerifyOTP = async (email, otp) => {
  const response = await fetch("/api/auth/verify-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include", // Important for session cookies
    body: JSON.stringify({ email, otp }),
  });

  const data = await response.json();

  if (data.success) {
    // User is now logged in
    router.push("/dashboard");
  } else {
    setError(data.message);
  }
};
```

## Troubleshooting

### Email Not Received

1. Check spam/junk folder
2. Verify SMTP credentials in `.env`
3. Check server logs for SMTP errors
4. Ensure Gmail App Password is correct (if using Gmail)
5. Verify firewall allows outbound connections on port 587

### SMTP Errors

```typescript
// Check server console for detailed errors
// Common issues:
// - Invalid credentials (535 error)
// - 2FA not enabled on Gmail
// - App Password not generated
// - Wrong SMTP host/port
```

### OTP Always Expired

- Check server system time is correct
- Verify timezone settings
- OTP validity is 10 minutes from generation time

## Database Verification

You can check the database to verify OTP storage:

```javascript
// Using Prisma Studio
npm run db:studio

// Or query directly
const user = await prisma.user.findUnique({
  where: { email: 'test@example.com' },
  select: {
    email: true,
    otp: true,
    otpExpiry: true,
    isEmailVerified: true,
    isActive: true
  }
});
```

## Security Notes

- OTPs are stored in plain text (6 digits, short-lived)
- OTPs expire after 10 minutes
- OTPs are immediately cleared upon successful verification
- Failed verification attempts don't lock the account
- Consider adding rate limiting for production (not implemented here)
