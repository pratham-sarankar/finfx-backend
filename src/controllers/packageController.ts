/**
 * Package Controller
 * Handles CRUD operations for subscription packages
 * Packages define duration-based subscription plans for trading bots
 */
import Package from "../models/Package";
import { NextFunction, Request, Response } from "express";
import { AppError } from "../middleware/errorHandler";

/**
 * Create a new subscription package
 * @route POST /api/packages
 * @access Private
 * @param {Request} req - Express request object containing name and duration
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 * @returns {Promise<void>} JSON response with created package data
 * @throws {AppError} 400 - Missing required fields or invalid data
 * @throws {AppError} 409 - Package with same name already exists
 */
export const createPackage = async (req: Request, res: Response,next:NextFunction) => {
  try {
    const { name, duration } = req.body;
    if (!name || !duration || duration <= 0) {
      throw new AppError("Please provide all required fields.", 400, "missing-required-fields");
    }
    const existing = await Package.findOne({ name });
    if (existing) {
      throw new AppError("A package with this name already exists.", 409, "package-already-exists");
    }
    const pkg = new Package({ name, duration });
    await pkg.save();
    return res.status(201).json({ success: true, message: "Package created", data: pkg });
  } catch (err) {
    return next(err)
  }
};

/**
 * Get all subscription packages
 * @route GET /api/packages
 * @access Private
 * @param {Request} _ - Express request object (unused)
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 * @returns {Promise<void>} JSON response with array of all packages
 * @description Retrieves all packages and transforms them to replace MongoDB _id with id field
 */
export const getPackages = async (_: Request, res: Response,next:NextFunction) => {
  try {
    const packages = await Package.find();
    // Transform packages to replace _id with id and remove __v field
    const transformedPackages = packages.map(pkg => {
      const obj = pkg.toObject();
      const { _id, __v, ...rest } = obj;
      return { id: _id, ...rest };
    });
    return res.status(200).json({ success: true, data: transformedPackages });
  } catch (err) {
    return next(err)
  }
};

/**
 * Get a single package by ID
 * @route GET /api/packages/:id
 * @access Private
 * @param {Request} req - Express request object containing package ID in params
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 * @returns {Promise<void>} JSON response with package data
 * @throws {AppError} 404 - Package not found
 */
export const getPackageById = async (req: Request, res: Response,next:NextFunction) => {
  try {
    const pkg = await Package.findById(req.params.id).select("-__v")
    if (!pkg) throw new AppError("The requested package could not be found.", 404, "package-not-found");
    // Transform package to replace _id with id field
    const obj = pkg.toObject();
    const { _id, __v, ...rest } = obj;
    return res.status(200).json({ success: true, data: { id: _id, ...rest } });
  } catch (err) {
    return next(err)
  }
};

/**
 * Update an existing package
 * @route PUT /api/packages/:id
 * @access Private
 * @param {Request} req - Express request object containing package ID and update data
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 * @returns {Promise<void>} JSON response with updated package data
 * @throws {AppError} 400 - Invalid duration, name, or missing update fields
 * @throws {AppError} 404 - Package not found
 */
export const updatePackage = async (req: Request, res: Response , next:NextFunction) => {
  try {
    const { name, duration } = req.body;
    
    // Validate input fields
    if (duration !== undefined && duration <= 0) {
      throw new AppError("Please provide a valid duration.", 400, "invalid-duration");
    }
    if (name !== undefined && name.trim() === "") {
      throw new AppError("Please provide a valid name.", 400, "invalid-name");
    }
    if (name === undefined && duration === undefined) {
      throw new AppError("Please provide information to update.", 400, "missing-update-fields");
    }
    
    // Build update object with only provided fields
    const updateFields: any = {};
    if (name !== undefined) updateFields.name = name;
    if (duration !== undefined) updateFields.duration = duration;
    
    const pkg = await Package.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true, runValidators: true }
    );
    if (!pkg) throw new AppError("The requested package could not be found.", 404, "package-not-found");
    return res.status(200).json({ success: true, message: "Package updated", data: pkg });
  } catch (err) {
    // Handle duplicate name error
    if ((err as any).code === 11000) {
      throw new AppError("A package with this name already exists.", 409, "package-already-exists");
    }
    return next(err)
  }
};

/**
 * Delete a package by ID
 * @route DELETE /api/packages/:id
 * @access Private
 * @param {Request} req - Express request object containing package ID in params
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 * @returns {Promise<void>} JSON response confirming deletion
 * @throws {AppError} 404 - Package not found
 */
export const deletePackage = async (req: Request, res: Response,next:NextFunction) => {
  try {
    const pkg = await Package.findByIdAndDelete(req.params.id);
    if (!pkg) throw new AppError("The requested package could not be found.", 404, "package-not-found");
    return res.status(200).json({ success: true, message: "Package deleted" });
  } catch (err) {
    return next(err)
  }
};
