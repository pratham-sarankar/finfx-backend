/**
 * Express Validation Middleware
 * Processes express-validator results and formats error responses
 * Provides consistent error format for validation failures
 */
import { NextFunction, Request, Response } from "express";
import { validationResult } from "express-validator";

/**
 * Validation middleware function
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 * @returns {void | Response} Continues to next middleware if valid, returns error response if invalid
 * @description Checks validation results from express-validator and returns formatted error
 *              response if validation fails, otherwise proceeds to next middleware
 */
export default function validate(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const result = validationResult(req);

  // If validation passes, continue to next middleware
  if (result.isEmpty()) {
    return next();
  }

  // Return formatted validation error response
  return res.status(400).json({
    status: "fail",
    message: result.array()[0].msg ?? "Validation Failed",
    errorCode: "validation-failed",
    errors: result.array(),
  });
}
