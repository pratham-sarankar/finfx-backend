import { NextFunction, Request, Response } from "express";
import Broker from "../models/Broker";
import mongoose from "mongoose";
import { AppError } from "../middleware/errorHandler";

export const getAllBrokers = async (_: Request, res: Response, next: NextFunction) => {
  try {
    const brokers = await Broker.find({});
    return res.status(200).json({ success: true, data: brokers });
  } catch (error: any) {
    return next(new AppError("Something went wrong. Please try again later.", 500, "internal-server-error"));
  }
};

export const addBroker = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name } = req.body;
    if (!name) {
      throw new AppError("Please provide all required fields.", 400, "missing-required-fields");
    }
    if (typeof name !== "string" || name.trim().length < 2) {
      throw new AppError("Please provide a valid name.", 400, "invalid-name");
    }
    const broker = await Broker.create({ name });
    return res.status(201).json({ success: true, message: "Broker created", data: broker });
  } catch (err: any) {
    if (err.code === 11000) {
      return next(new AppError("A broker with this name already exists.", 409, "broker-already-exists"));
    }
    return next(err)
  }
};

export const deleteBroker = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError("Invalid request. Please try again.", 400, "invalid-request");
    }
    const broker = await Broker.findByIdAndDelete(id);
    if (!broker) {
      throw new AppError("The requested broker could not be found.", 404, "broker-not-found");
    }
    return res.status(200).json({ success: true, message: "Broker deleted" });
  } catch (err: any) {
    return next(err)
  }
};
