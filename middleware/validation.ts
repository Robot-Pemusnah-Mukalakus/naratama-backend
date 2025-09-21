/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextFunction, Request, Response } from "express";
import { z, ZodError } from "zod";

// Validation middleware factory
export const validateSchema = (
  schema: z.ZodType,
  target: "body" | "params" | "query" = "body"
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const dataToValidate: unknown = req[target];
      const validatedData = schema.parse(dataToValidate);

      // Replace the original data with validated data
      (req as any)[target] = validatedData;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          errors: error.issues.map((err: z.core.$ZodIssue) => ({
            code: err.code,
            field: err.path.join("."),
            message: err.message,
          })),
          message: "Validation error",
          success: false,
        });
      }

      return res.status(500).json({
        error: process.env.NODE_ENV === "development" ? error : undefined,
        message: "Internal server error during validation",
        success: false,
      });
    }
  };
};

// Multiple target validation middleware
export const validateMultiple = (schemas: {
  body?: z.ZodType;
  params?: z.ZodType;
  query?: z.ZodType;
}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors: { code: string; field: string; message: string }[] = [];

      // Validate body
      if (schemas.body) {
        try {
          (req as any).body = schemas.body.parse(req.body);
        } catch (error) {
          if (error instanceof ZodError) {
            errors.push(
              ...error.issues.map((err: z.core.$ZodIssue) => ({
                code: err.code,
                field: `body.${err.path.join(".")}`,
                message: err.message,
              }))
            );
          }
        }
      }

      // Validate params
      if (schemas.params) {
        try {
          (req as any).params = schemas.params.parse(req.params);
        } catch (error) {
          if (error instanceof ZodError) {
            errors.push(
              ...error.issues.map((err: z.core.$ZodIssue) => ({
                code: err.code,
                field: `params.${err.path.join(".")}`,
                message: err.message,
              }))
            );
          }
        }
      }

      // Validate query
      if (schemas.query) {
        try {
          (req as any).query = schemas.query.parse(req.query);
        } catch (error) {
          if (error instanceof ZodError) {
            errors.push(
              ...error.issues.map((err: z.core.$ZodIssue) => ({
                code: err.code,
                field: `query.${err.path.join(".")}`,
                message: err.message,
              }))
            );
          }
        }
      }

      if (errors.length > 0) {
        return res.status(400).json({
          errors,
          message: "Validation error",
          success: false,
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        error: process.env.NODE_ENV === "development" ? error : undefined,
        message: "Internal server error during validation",
        success: false,
      });
    }
  };
};

// Utility function to validate data without middleware
export const validateData = <T>(
  schema: z.ZodType<T>,
  data: unknown
):
  | { data: T; success: true }
  | {
      errors: { code: string; field: string; message: string }[];
      success: false;
    } => {
  try {
    const validatedData = schema.parse(data);
    return { data: validatedData, success: true };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        errors: error.issues.map((err: z.core.$ZodIssue) => ({
          code: err.code,
          field: err.path.join("."),
          message: err.message,
        })),
        success: false,
      };
    }
    throw error;
  }
};

// Utility function for safe parsing
export const safeValidate = <T>(schema: z.ZodType<T>, data: unknown) => {
  return schema.safeParse(data);
};
