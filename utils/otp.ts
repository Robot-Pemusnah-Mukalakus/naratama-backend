import crypto from "crypto";
import nodemailer from "nodemailer";

/**
 * Generate a random 6-digit OTP
 */
export function generateOTP(): string {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Send OTP via email using SMTP
 */
export async function sendOTPEmail(
  email: string,
  otp: string,
  name?: string
): Promise<void> {
  const transporter = nodemailer.createTransport({
    auth: {
      pass: process.env.SMTP_PASSWORD,
      user: process.env.SMTP_USER,
    },
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false, // true for 465, false for other ports
  });

  const mailOptions = {
    from: `"Naratama Library" <${process.env.SMTP_FROM}>`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .container {
              background-color: #f4f4f4;
              border-radius: 10px;
              padding: 30px;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .otp-box {
              background-color: #fff;
              border: 2px solid #4CAF50;
              border-radius: 8px;
              padding: 20px;
              text-align: center;
              margin: 20px 0;
            }
            .otp-code {
              font-size: 32px;
              font-weight: bold;
              letter-spacing: 8px;
              color: #4CAF50;
              margin: 10px 0;
            }
            .footer {
              margin-top: 30px;
              text-align: center;
              font-size: 12px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to Naratama Library!</h1>
            </div>
            <p>Hello${name ? " " + name : ""},</p>
            <p>Thank you for registering with Naratama Library. To complete your registration, please use the following One-Time Password (OTP):</p>
            
            <div class="otp-box">
              <p style="margin: 0; font-size: 14px; color: #666;">Your OTP Code</p>
              <div class="otp-code">${otp}</div>
              <p style="margin: 0; font-size: 12px; color: #999;">This code will expire in 10 minutes</p>
            </div>
            
            <p><strong>Important:</strong></p>
            <ul>
              <li>Do not share this OTP with anyone</li>
              <li>This code is valid for 10 minutes only</li>
              <li>If you didn't request this, please ignore this email</li>
            </ul>
            
            <div class="footer">
              <p>This is an automated email. Please do not reply.</p>
              <p>&copy; ${new Date().getFullYear()} Naratama Library. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    subject: "Verify Your Email - Naratama Library",
    text: `Welcome to Naratama Library!\n\nYour OTP code is: ${otp}\n\nThis code will expire in 10 minutes.\n\nDo not share this code with anyone.`,
    to: email,
  };

  await transporter.sendMail(mailOptions);
}

/**
 * Check if OTP is expired (10 minutes validity)
 */
export function isOTPExpired(otpExpiry: Date | null): boolean {
  if (!otpExpiry) return true;
  return new Date() > otpExpiry;
}

/**
 * Get OTP expiry time (10 minutes from now)
 */
export function getOTPExpiry(): Date {
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + 10);
  return expiry;
}
