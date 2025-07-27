import { NextFunction, Request, Response } from "express";
import { validationResult } from "express-validator";

export default function validate(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const result = validationResult(req);
  if (result.isEmpty()) {
    return next();
  }
  return res.json({
    status: "fail",
    message: result.array()[0].msg ?? "Validation Failed",
    errorCode: "validation-failed",
    errors: result.array(),
  });
}
