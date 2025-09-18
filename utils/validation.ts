import { z } from "zod";

// ======================= PATTERN =========================
// phoneNumberPattern: starts with + followed by 10 to 15 digits
// isbnPattern: ISBN-10 or ISBN-13 validation pattern
// passwordRequirement: 8 characters, at least 1 uppercase, 1 lowercase, 1 number and 1 special character
// membershipCode: mbr-XXXX (X: uppercase letter or digit)
// ========================================================

export const phoneNumberPattern = /^[+][0-9]{10,15}$/;

export const isbnPattern =
  /^(?:ISBN(?:-1[03])?:? )?(?=[0-9X]{10}$|(?=(?:[0-9]+[- ]){3})[- 0-9X]{13}$|97[89][0-9]{10}$|(?=(?:[0-9]+[- ]){4})[- 0-9]{17}$)(?:97[89][- ]?)?[0-9]{1,5}[- ]?[0-9]+[- ]?[0-9]+[- ]?[0-9X]$/;

export const passwordRequirement =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;

export const membershipCode = /^mbr-[A-Z0-9]+$/;

export const phoneNumber = z
  .string()
  .regex(
    phoneNumberPattern,
    "Invalid phone number format, use +<countrycode><number> (e.g., +1234567890)"
  );

export const name = z
  .string()
  .min(1, "Name is required")
  .max(100, "Name too long");

export const email = z.email("Invalid email format");
export const passwordReq = z
  .string()
  .regex(
    passwordRequirement,
    "Password must be at least 8 characters, include uppercase, lowercase, number, and special character"
  );
