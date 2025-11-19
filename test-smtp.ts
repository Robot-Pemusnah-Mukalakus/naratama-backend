import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

/**
 * Test SMTP Configuration
 * Run this file to test if your SMTP settings are correct
 *
 * Usage: npx tsx test-smtp.ts
 */

async function testSMTPConnection() {
  console.log("\n🔍 Testing SMTP Configuration...\n");

  // Check if environment variables are set
  console.log("Environment Variables:");
  console.log("  SMTP_HOST:", process.env.SMTP_HOST || "❌ NOT SET");
  console.log("  SMTP_PORT:", process.env.SMTP_PORT || "❌ NOT SET");
  console.log("  SMTP_USER:", process.env.SMTP_USER || "❌ NOT SET");
  console.log(
    "  SMTP_PASSWORD:",
    process.env.SMTP_PASSWORD ? "✅ SET" : "❌ NOT SET"
  );
  console.log("");

  if (
    !process.env.SMTP_HOST ||
    !process.env.SMTP_USER ||
    !process.env.SMTP_PASSWORD
  ) {
    console.error("❌ Missing required SMTP environment variables!");
    console.log("\nPlease set the following in your .env file:");
    console.log("  SMTP_HOST=smtp.gmail.com");
    console.log("  SMTP_PORT=587");
    console.log("  SMTP_USER=your-email@gmail.com");
    console.log("  SMTP_PASSWORD=your-app-password");
    process.exit(1);
  }

  try {
    // Create transporter
    const transporter = nodemailer.createTransport({
      auth: {
        pass: process.env.SMTP_PASSWORD,
        user: process.env.SMTP_USER,
      },
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
    });

    console.log("📧 Testing SMTP connection...");

    // Verify connection
    await transporter.verify();
    console.log("✅ SMTP connection successful!\n");

    // Send test email
    const testEmail = process.env.SMTP_USER;
    console.log(`📨 Sending test email to ${testEmail}...`);

    const info = await transporter.sendMail({
      from: `"Naratama Library Test" <${process.env.SMTP_USER}>`,
      html: `
        <h2>SMTP Test Successful!</h2>
        <p>Your SMTP configuration is working correctly.</p>
        <p>You can now use email verification in your application.</p>
        <hr>
        <p><small>This is a test email from Naratama Library Backend</small></p>
      `,
      subject: "✅ SMTP Test - Configuration Successful",
      text: "Your SMTP configuration is working correctly!",
      to: testEmail,
    });

    console.log("✅ Test email sent successfully!");
    console.log("   Message ID:", info.messageId);
    console.log("\n✨ All tests passed! Your SMTP is configured correctly.\n");
  } catch (error) {
    console.error("\n❌ SMTP Test Failed!\n");
    console.error("Error:", error);
    console.log("\n💡 Common issues:");
    console.log("   1. Wrong Gmail App Password (must be 16 characters)");
    console.log("   2. 2FA not enabled on Gmail account");
    console.log("   3. Wrong email address in SMTP_USER");
    console.log("   4. Firewall blocking port 587");
    console.log("\n📚 See SMTP_SETUP_GUIDE.md for detailed instructions.\n");
    process.exit(1);
  }
}

testSMTPConnection();
