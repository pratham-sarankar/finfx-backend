import { Request, Response, NextFunction } from "express";
import { AppError } from "./errorHandler";

export const authorizeRoles = (...allowedRoles: string[]) => {
  return (req: Request, _: Response, next: NextFunction) => {
    const user = req.user; 

    console.log(user)

    if (!user || !allowedRoles.includes(user.role)) {
      return next(
        new AppError("You are not authorized to access this resource", 403,"not-authorized")
      );
    }

  return  next();
  };
};
