import Package from "../models/Package";
import { NextFunction, Request, Response } from "express";
import { AppError } from "../middleware/errorHandler";

// Create a new package
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

// Get all packages
export const getPackages = async (_: Request, res: Response,next:NextFunction) => {
  try {
    const packages = await Package.find();
    return res.status(200).json({ success: true, data: packages });
  } catch (err) {
    return next(err)
  }
};

// Get a single package by ID
export const getPackageById = async (req: Request, res: Response,next:NextFunction) => {
  try {
    const pkg = await Package.findById(req.params.id);
    if (!pkg) throw new AppError("The requested package could not be found.", 404, "package-not-found");
    return res.status(200).json({ success: true, data: pkg });
  } catch (err) {
    return next(err)
  }
};

// Update a package
export const updatePackage = async (req: Request, res: Response , next:NextFunction) => {
  try {
    const { name, duration } = req.body;
    if (duration !== undefined && duration <= 0) {
      throw new AppError("Please provide a valid duration.", 400, "invalid-duration");
    }
    if (name !== undefined && name.trim() === "") {
      throw new AppError("Please provide a valid name.", 400, "invalid-name");
    }
    if (name === undefined && duration === undefined) {
      throw new AppError("Please provide information to update.", 400, "missing-update-fields");
    }
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
    if ((err as any).code === 11000) {
      throw new AppError("A package with this name already exists.", 409, "package-already-exists");
    }
    return next(err)
  }
};

// Delete a package
export const deletePackage = async (req: Request, res: Response,next:NextFunction) => {
  try {
    const pkg = await Package.findByIdAndDelete(req.params.id);
    if (!pkg) throw new AppError("The requested package could not be found.", 404, "package-not-found");
    return res.status(200).json({ success: true, message: "Package deleted" });
  } catch (err) {
    return next(err)
  }
};
