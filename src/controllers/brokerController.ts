import { Request, Response } from "express";
import Broker from "../models/Broker";
import mongoose from "mongoose";

export const getAllBrokers = async (_: Request, res: Response) => {
  try {
    const brokers = await Broker.find({});
    return res.status(200).json({ success: true, data: brokers });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const addBroker = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: "Name is required" });
    }
    if (typeof name !== "string" || name.trim().length < 2) {
      return res.status(400).json({ success: false, message: "Name must be a valid string with at least 2 characters" });
    }
    const broker = await Broker.create({ name });
    return res.status(201).json({ success: true, message: "Broker created", data: broker });
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: "Broker already exists" });
    }
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteBroker = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid broker ID format" });
    }
    const broker = await Broker.findByIdAndDelete(id);
    if (!broker) {
      return res.status(404).json({ success: false, message: "Broker not found" });
    }
    return res.status(200).json({ success: true, message: "Broker deleted" });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
