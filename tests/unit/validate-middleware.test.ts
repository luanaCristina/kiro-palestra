import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { validate } from "../../src/middleware/validate";

/**
 * Helper to create a mock Express request.
 */
function mockRequest(overrides: Partial<Request> = {}): Request {
  return {
    body: {},
    query: {},
    params: {},
    ...overrides,
  } as Request;
}

/**
 * Helper to create a mock Express response with chainable json/status.
 */
function mockResponse(): Response & { _status: number; _json: unknown } {
  const res = {
    _status: 0,
    _json: null as unknown,
    status(code: number) {
      res._status = code;
      return res;
    },
    json(data: unknown) {
      res._json = data;
      return res;
    },
  };
  return res as unknown as Response & { _status: number; _json: unknown };
}

describe("validate middleware", () => {
  const testSchema = z.object({
    name: z.string().min(1, { message: "name is required" }),
    age: z.number().int().min(0, { message: "age must be non-negative" }),
  });

  let next: jest.Mock;

  beforeEach(() => {
    next = jest.fn();
  });

  describe("successful validation", () => {
    it("calls next() when body data is valid", () => {
      const req = mockRequest({ body: { name: "Alice", age: 30 } });
      const res = mockResponse();

      validate(testSchema, "body")(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(res._status).toBe(0);
    });

    it("attaches parsed data to the request source", () => {
      const req = mockRequest({ body: { name: "Bob", age: 25 } });
      const res = mockResponse();

      validate(testSchema, "body")(req, res, next);

      expect(req.body).toEqual({ name: "Bob", age: 25 });
      expect(next).toHaveBeenCalled();
    });

    it("validates query parameters when source is 'query'", () => {
      const querySchema = z.object({
        specialty: z.string(),
      });
      const req = mockRequest({ query: { specialty: "cardiology" } as any });
      const res = mockResponse();

      validate(querySchema, "query")(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.query).toEqual({ specialty: "cardiology" });
    });

    it("validates params when source is 'params'", () => {
      const paramsSchema = z.object({
        id: z.string().uuid(),
      });
      const req = mockRequest({
        params: { id: "550e8400-e29b-41d4-a716-446655440000" } as any,
      });
      const res = mockResponse();

      validate(paramsSchema, "params")(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.params).toEqual({ id: "550e8400-e29b-41d4-a716-446655440000" });
    });

    it("defaults to 'body' source when not specified", () => {
      const req = mockRequest({ body: { name: "Charlie", age: 40 } });
      const res = mockResponse();

      validate(testSchema)(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it("strips unknown fields from parsed data", () => {
      const req = mockRequest({ body: { name: "Dave", age: 35, extra: "field" } });
      const res = mockResponse();

      validate(testSchema, "body")(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.body).toEqual({ name: "Dave", age: 35 });
    });
  });

  describe("failed validation", () => {
    it("returns 400 status on validation failure", () => {
      const req = mockRequest({ body: { name: "", age: -1 } });
      const res = mockResponse();

      validate(testSchema, "body")(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res._status).toBe(400);
    });

    it("returns ErrorResponse format with error code, message, and details", () => {
      const req = mockRequest({ body: { name: 123, age: "not-a-number" } });
      const res = mockResponse();

      validate(testSchema, "body")(req, res, next);

      const response = res._json as any;
      expect(response).toHaveProperty("error");
      expect(response.error).toHaveProperty("code", "VALIDATION_ERROR");
      expect(response.error).toHaveProperty("message");
      expect(response.error).toHaveProperty("details");
      expect(response.error.details).toHaveProperty("fields");
    });

    it("includes field-level errors in details", () => {
      const req = mockRequest({ body: { name: "", age: -1 } });
      const res = mockResponse();

      validate(testSchema, "body")(req, res, next);

      const response = res._json as any;
      expect(response.error.details.fields).toHaveProperty("name");
      expect(response.error.details.fields).toHaveProperty("age");
    });

    it("returns a single error message for one field failure", () => {
      const req = mockRequest({ body: { name: "Valid", age: -5 } });
      const res = mockResponse();

      validate(testSchema, "body")(req, res, next);

      const response = res._json as any;
      expect(response.error.message).toContain("age");
      expect(response.error.message).not.toContain("Validation failed:");
    });

    it("returns combined message for multiple field failures", () => {
      const req = mockRequest({ body: {} });
      const res = mockResponse();

      validate(testSchema, "body")(req, res, next);

      const response = res._json as any;
      expect(response.error.message).toContain("Validation failed:");
    });

    it("does not call next() on failure", () => {
      const req = mockRequest({ body: { invalid: true } });
      const res = mockResponse();

      validate(testSchema, "body")(req, res, next);

      expect(next).not.toHaveBeenCalled();
    });
  });
});
