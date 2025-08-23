/**
 * Role-Based Access Control (RBAC) Middleware
 * Provides authorization functionality for different user roles
 */
import { Request, Response, NextFunction } from "express";
import { AppError } from "./errorHandler";

/**
 * Middleware to check if user has required role(s)
 * @param {string | string[]} roles - Required role(s) to access the resource
 * @returns {Function} Express middleware function
 */
export const requireRole = (roles: string | string[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      // Ensure user is authenticated (should be set by auth middleware)
      if (!req.user) {
        throw new AppError("Authentication required", 401, "authentication-required");
      }

      // Convert single role to array for consistent handling
      const requiredRoles = Array.isArray(roles) ? roles : [roles];

      // Check if user has one of the required roles
      if (!requiredRoles.includes(req.user.role)) {
        throw new AppError(
          "Insufficient permissions to access this resource",
          403,
          "insufficient-permissions"
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to check if user is admin
 */
export const requireAdmin = requireRole('admin');

/**
 * Middleware to check if user is either admin or user (basically any authenticated user)
 */
export const requireUser = requireRole(['admin', 'user']);

/**
 * Middleware to check if user can access a resource owned by a specific user
 * Admins can access any resource, users can only access their own resources
 * @param {string} userIdField - Field name in request params/body that contains the target user ID
 * @returns {Function} Express middleware function
 */
export const requireOwnershipOrAdmin = (userIdField: string = 'userId') => {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      // Ensure user is authenticated
      if (!req.user) {
        throw new AppError("Authentication required", 401, "authentication-required");
      }

      // Admin users can access any resource
      if (req.user.role === 'admin') {
        return next();
      }

      // For non-admin users, check ownership
      const targetUserId = req.params[userIdField] || req.body[userIdField];
      
      if (!targetUserId) {
        throw new AppError(
          `${userIdField} is required`,
          400,
          "missing-user-id"
        );
      }

      // Check if the user is trying to access their own resource
      if (req.user._id.toString() !== targetUserId.toString()) {
        throw new AppError(
          "You can only access your own resources",
          403,
          "access-denied"
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};