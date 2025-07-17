import Package from "../models/Package";
import { Request, Response } from "express";

// Create a new package
export const createPackage = async (req: Request, res: Response) => {
  try {
    const { name, duration } = req.body;
    if (!name || !duration || duration <= 0) {
      return res.status(400).json({ message: "Name and valid duration are required." });
    }
    const existing = await Package.findOne({ name });
    if (existing) {
      return res.status(409).json({ message: "Package with this name already exists." });
    }
    const pkg = new Package({ name, duration });
    await pkg.save();
  return  res.status(201).json(pkg);
  } catch (err) {
  return  res.status(500).json({ message: "Server error", error: err });
  }
};

// Get all packages
export const getPackages = async (_: Request, res: Response) => {
  try {
    const packages = await Package.find();
  return  res.json(packages);
  } catch (err) {
  return  res.status(500).json({ message: "Server error", error: err });
  }
};

// Get a single package by ID
export const getPackageById = async (req: Request, res: Response) => {
  try {
    const pkg = await Package.findById(req.params.id);
    if (!pkg) return res.status(404).json({ message: "Package not found" });
  return  res.json(pkg);
  } catch (err) {
   return res.status(500).json({ message: "Server error", error: err });
  }
};

// Update a package
export const updatePackage = async (req: Request, res: Response) => {
  try {
    const { name, duration } = req.body;
    if (duration !== undefined && duration <= 0) {
      return res.status(400).json({ message: "Duration must be greater than 0." });
    }
    if (name !== undefined && name.trim() === "") {
      return res.status(400).json({ message: "Name cannot be empty." });
    }
    if (name === undefined && duration === undefined) {
      return res.status(400).json({ message: "Please provide at least one field to update (name or duration)." });
    }
    const updateFields: any = {};
    if (name !== undefined) updateFields.name = name;
    if (duration !== undefined) updateFields.duration = duration;
    const pkg = await Package.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true, runValidators: true }
    );
    if (!pkg) return res.status(404).json({ message: "Package not found" });
    return res.json(pkg);
  } catch (err) {
    if ((err as any).code === 11000) {
      return res.status(409).json({ message: "Package name must be unique." });
    }
    return res.status(500).json({ message: "Server error", error: (err as Error).message });
  }
};

// Delete a package
export const deletePackage = async (req: Request, res: Response) => {
  try {
    const pkg = await Package.findByIdAndDelete(req.params.id);
    if (!pkg) return res.status(404).json({ message: "Package not found" });
  return  res.json({ message: "Package deleted" });
  } catch (err) {
  return  res.status(500).json({ message: "Server error", error: (err as Error).message });
  }
};
