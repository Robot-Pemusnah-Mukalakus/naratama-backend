import { Request, Response, NextFunction } from "express";
import { z, ZodSchema, ZodError } from "zod";
import { $ZodIssue, $ZodError } from "@zod/core";

export const validateSchema = (
  schema: ZodSchema,
  target: "body" | "params" | "query" = "body"
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const dataToValidate = req[target];
      const validatedData = schema.parse(dataToValidate);

      (req as any)[target] = validatedData;
      next();
    } catch (error) {
      if (error instanceof $ZodError) {
        return res.status(400).json({
          success: false,
          message: "Validation error",
          errors: error.issues.map((err: $ZodIssue) => ({
            field: err.path.join("."),
            message: err.message,
            code: err.code,
          })),
        });
      }

      return res.status(500).json({
        success: false,
        message: "Internal server error during validation",
        error: process.env.NODE_ENV === "development" ? error : undefined,
      });
    }
  };
};

export const validateMultiple = (schemas: {
  body?: ZodSchema;
  params?: ZodSchema;
  query?: ZodSchema;
}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors: Array<{ field: string; message: string; code: string }> =
        [];

      // Validate body
      if (schemas.body) {
        try {
          (req as any).body = schemas.body.parse(req.body);
        } catch (error) {
          if (error instanceof ZodError) {
            errors.push(
              ...error.issues.map((err: z.ZodIssue) => ({
                field: `body.${err.path.join(".")}`,
                message: err.message,
                code: err.code,
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
              ...error.issues.map((err: z.ZodIssue) => ({
                field: `params.${err.path.join(".")}`,
                message: err.message,
                code: err.code,
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
              ...error.issues.map((err: z.ZodIssue) => ({
                field: `query.${err.path.join(".")}`,
                message: err.message,
                code: err.code,
              }))
            );
          }
        }
      }

      if (errors.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Validation error",
          errors,
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Internal server error during validation",
        error: process.env.NODE_ENV === "development" ? error : undefined,
      });
    }
  };
};

export const validateData = <T>(
  schema: ZodSchema<T>,
  data: unknown
):
  | { success: true; data: T }
  | {
      success: false;
      errors: Array<{ field: string; message: string; code: string }>;
    } => {
  try {
    const validatedData = schema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        errors: error.issues.map((err: z.ZodIssue) => ({
          field: err.path.join("."),
          message: err.message,
          code: err.code,
        })),
      };
    }
    throw error;
  }
};

export const safeValidate = <T>(schema: ZodSchema<T>, data: unknown) => {
  return schema.safeParse(data);
};
