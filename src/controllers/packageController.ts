import Package from "../models/Package";
import { NextFunction, Request, Response } from "express";

// Create a new package
export const createPackage = async (req: Request, res: Response,next:NextFunction) => {
  try {
    const { name, duration } = req.body;
    if (!name || !duration || duration <= 0) {
      return res.status(400).json({ success: false, message: "Name and valid duration are required." });
    }
    const existing = await Package.findOne({ name });
    if (existing) {
      return res.status(409).json({ success: false, message: "Package with this name already exists." });
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
    if (!pkg) return res.status(404).json({ success: false, message: "Package not found" });
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
      return res.status(400).json({ success: false, message: "Duration must be greater than 0." });
    }
    if (name !== undefined && name.trim() === "") {
      return res.status(400).json({ success: false, message: "Name cannot be empty." });
    }
    if (name === undefined && duration === undefined) {
      return res.status(400).json({ success: false, message: "Please provide at least one field to update (name or duration)." });
    }
    const updateFields: any = {};
    if (name !== undefined) updateFields.name = name;
    if (duration !== undefined) updateFields.duration = duration;
    const pkg = await Package.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true, runValidators: true }
    );
    if (!pkg) return res.status(404).json({ success: false, message: "Package not found" });
    return res.status(200).json({ success: true, message: "Package updated", data: pkg });
  } catch (err) {
    if ((err as any).code === 11000) {
      return res.status(409).json({ success: false, message: "Package name must be unique." });
    }
    return next(err)
  }
};

// Delete a package
export const deletePackage = async (req: Request, res: Response,next:NextFunction) => {
  try {
    const pkg = await Package.findByIdAndDelete(req.params.id);
    if (!pkg) return res.status(404).json({ success: false, message: "Package not found" });
    return res.status(200).json({ success: true, message: "Package deleted" });
  } catch (err) {
    return next(err)
  }
};
