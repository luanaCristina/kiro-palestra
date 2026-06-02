import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";
import { ErrorResponse } from "../models/errors";

/**
 * The source of request data to validate.
 */
type ValidationSource = "body" | "query" | "params";

/**
 * Express middleware that validates request data against a Zod schema.
 *
 * On success, replaces the request source with the parsed (and potentially
 * transformed) data and calls next().
 *
 * On failure, returns a 400 response with the standard ErrorResponse format.
 *
 * @param schema - The Zod schema to validate against
 * @param source - Which part of the request to validate ('body', 'query', or 'params')
 *
 * @example
 * router.get('/search', validate(searchQuerySchema, 'query'), handler);
 * router.post('/appointments', validate(bookingRequestSchema, 'body'), handler);
 */
export function validate(schema: ZodSchema, source: ValidationSource = "body") {
  return (req: Request, res: Response, next: NextFunction): void => {
    const data = req[source];
    const result = schema.safeParse(data);

    if (result.success) {
      req[source] = result.data;
      next();
      return;
    }

    const errorResponse: ErrorResponse = {
      error: {
        code: "VALIDATION_ERROR",
        message: formatErrorMessage(result.error),
        details: formatErrorDetails(result.error),
      },
    };

    res.status(400).json(errorResponse);
  };
}

/**
 * Formats a ZodError into a human-readable message string.
 */
function formatErrorMessage(error: ZodError): string {
  const messages = error.errors.map((issue) => {
    const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
    return `${path}${issue.message}`;
  });

  return messages.length === 1
    ? messages[0]
    : `Validation failed: ${messages.join("; ")}`;
}

/**
 * Formats a ZodError into a details object with field-level error information.
 */
function formatErrorDetails(error: ZodError): Record<string, unknown> {
  const fields: Record<string, string> = {};

  for (const issue of error.errors) {
    const key = issue.path.length > 0 ? issue.path.join(".") : "_root";
    fields[key] = issue.message;
  }

  return { fields };
}
