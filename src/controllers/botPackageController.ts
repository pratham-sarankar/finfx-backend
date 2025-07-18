import BotPackage from "../models/BotPackage";
import { Request, Response } from "express";

// Create a new BotPackage
export const createBotPackage = async (req: Request, res: Response) => {
  try {
    const { botId, packageId, price } = req.body;
    if (!botId || !packageId || price === undefined || price === null || typeof price !== 'number' || price <= 0) {
      return res.status(400).json({ message: "botId, packageId, and valid price are required." });
    }
    const existing = await BotPackage.findOne({ botId, packageId });
    if (existing) {
      return res.status(409).json({ message: "BotPackage for this bot and package already exists." });
    }
    const botPackage = new BotPackage({ botId, packageId, price });
    await botPackage.save();
    return res.status(201).json(botPackage);
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: (err as Error).message });
  }
};

// Get all BotPackages
export const getBotPackages = async (_: Request, res: Response) => {
  try {
    const botPackages = await BotPackage.find().populate('botId').populate('packageId');
  return  res.json(botPackages);
  } catch (err) {
  return  res.status(500).json({ message: "Server error", error: (err as Error).message });
  }
};

// Get a single BotPackage by ID
export const getBotPackageById = async (req: Request, res: Response) => {
  try {
    const botPackage = await BotPackage.findById(req.params.id).populate('botId').populate('packageId');
    if (!botPackage) return res.status(404).json({ message: "BotPackage not found" });
  return  res.json(botPackage);
  } catch (err) {
  return  res.status(500).json({ message: "Server error", error: (err as Error).message });
  }
};

// Update a BotPackage
export const updateBotPackage = async (req: Request, res: Response) => {
  try {
    const { price } = req.body;
    if (price === undefined || price === null) {
      return res.status(400).json({ message: "Please provide valid price" });
    }
    if (typeof price !== 'number' || price < 0) {
      return res.status(400).json({ message: "Price must be a valid non-negative number." });
    }
    const botPackage = await BotPackage.findByIdAndUpdate(
      req.params.id,
      { $set: { price } },
      { new: true, runValidators: true }
    );
    if (!botPackage) {
      return res.status(404).json({ message: "BotPackage not found" });
    }
    return res.json(botPackage);
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: (err as Error).message });
  }
};

// Delete a BotPackage
export const deleteBotPackage = async (req: Request, res: Response) => {
  try {
    const botPackage = await BotPackage.findByIdAndDelete(req.params.id);
    if (!botPackage) return res.status(404).json({ message: "BotPackage not found" });
  return  res.json({ message: "BotPackage deleted" });
  } catch (err) {
  return  res.status(500).json({ message: "Server error", error: (err as Error).message });
  }
};
