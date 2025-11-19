# Quick Fix for SMTP Authentication Error

## The Problem

You're getting error: `535 5.7.8 Authentication failed` because the SMTP credentials are not configured correctly.

## The Solution

### Step 1: Update Environment Variables

Your `.env` file needs these variables (NOT `SMTP_KEY`):

```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-actual-email@gmail.com"
SMTP_PASSWORD="your-16-character-app-password"
```

### Step 2: Generate Gmail App Password

1. **Enable 2-Factor Authentication** on your Google Account:
   - Go to: https://myaccount.google.com/security
   - Enable 2-Step Verification

2. **Generate an App Password**:
   - Go to: https://myaccount.google.com/apppasswords
   - Select "App" → Choose "Mail"
   - Select "Device" → Choose "Windows Computer" (or Other)
   - Click "Generate"
   - Copy the 16-character password (it will look like: `abcd efgh ijkl mnop`)

3. **Add to .env** (remove spaces):
   ```env
   SMTP_USER="youremail@gmail.com"
   SMTP_PASSWORD="abcdefghijklmnop"
   ```

### Step 3: Restart the Server

```bash
# Stop the current server (Ctrl+C)
# Then restart
npm run dev
```

### Step 4: Test Again

Try registering a user:

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

## Alternative: Using Other Email Providers

### Gmail Settings

```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-gmail@gmail.com"
SMTP_PASSWORD="your-app-password"
```

### Outlook/Hotmail

```env
SMTP_HOST="smtp-mail.outlook.com"
SMTP_PORT=587
SMTP_USER="your-email@outlook.com"
SMTP_PASSWORD="your-password"
```

### SendGrid

```env
SMTP_HOST="smtp.sendgrid.net"
SMTP_PORT=587
SMTP_USER="apikey"
SMTP_PASSWORD="your-sendgrid-api-key"
```

### Mailgun

```env
SMTP_HOST="smtp.mailgun.org"
SMTP_PORT=587
SMTP_USER="postmaster@your-domain.mailgun.org"
SMTP_PASSWORD="your-mailgun-password"
```

## Troubleshooting

### Still getting 535 error?

- Make sure 2FA is enabled on Gmail
- Double-check the app password (no spaces)
- Verify the email address is correct
- Try generating a new app password

### Connection timeout?

- Check firewall settings
- Ensure port 587 is not blocked
- Try using port 465 with `secure: true`

### "Less secure app access" message?

- Gmail deprecated this - you MUST use App Passwords now
- Regular Gmail passwords won't work with SMTP anymore

## Example .env File

```env
# Server Configuration
PORT=8080

# MongoDB Configuration
DATABASE_URL="mongodb+srv://username:password@cluster.mongodb.net/naratama"

# Session Configuration
SESSION_SECRET="your-secret-key-here"

# Google OAuth (Optional)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_CALLBACK_URL="http://localhost:8080/api/auth/google/callback"

# SMTP Configuration (REQUIRED for OTP)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="youremail@gmail.com"
SMTP_PASSWORD="abcdefghijklmnop"

# CORS Configuration
FRONTEND_URL=http://localhost:3000

# Environment
NODE_ENV=development
```

## Need More Help?

Check the server console for detailed error messages. The SMTP error will tell you:

- `535` = Wrong credentials
- `530` = Authentication required
- Connection timeout = Network/firewall issue
- `550` = Invalid recipient email
