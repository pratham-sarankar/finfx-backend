/**
 * Broker Controller
 * Handles CRUD operations for broker management
 * Brokers represent trading platforms/services that users can connect to
 */
import { NextFunction, Request, Response } from "express";
import Broker from "../models/Broker";
import mongoose from "mongoose";
import { AppError } from "../middleware/errorHandler";

/**
 * Get all brokers
 * @route GET /api/brokers
 * @access Private
 * @param {Request} _ - Express request object (unused)
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 * @returns {Promise<void>} JSON response with array of all brokers
 * @description Retrieves all brokers and transforms them to replace MongoDB _id with id field
 */
export const getAllBrokers = async (_: Request, res: Response, next: NextFunction) => {
  try {
    const brokers = await Broker.find({});
    // Transform brokers to replace _id with id and remove __v field
    const transformedBrokers = brokers.map(broker => {
      const obj = broker.toObject();
      const { _id, __v, ...rest } = obj;
      return { id: _id, ...rest };
    });
    return res.status(200).json({ success: true, data: transformedBrokers });
  } catch (error: any) {
    return next(new AppError("Something went wrong. Please try again later.", 500, "internal-server-error"));
  }
};

/**
 * Add a new broker
 * @route POST /api/brokers
 * @access Private
 * @param {Request} req - Express request object containing broker name
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 * @returns {Promise<void>} JSON response with created broker data
 * @throws {AppError} 400 - Missing required fields or invalid name
 * @throws {AppError} 409 - Broker with same name already exists
 */
export const addBroker = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name } = req.body;
    
    // Validate required fields
    if (!name) {
      throw new AppError("Please provide all required fields.", 400, "missing-required-fields");
    }
    
    // Validate name format and length
    if (typeof name !== "string" || name.trim().length < 2) {
      throw new AppError("Please provide a valid name.", 400, "invalid-name");
    }
    
    const broker = await Broker.create({ name });
    return res.status(201).json({ success: true, message: "Broker created", data: broker });
  } catch (err: any) {
    // Handle duplicate name error
    if (err.code === 11000) {
      return next(new AppError("A broker with this name already exists.", 409, "broker-already-exists"));
    }
    return next(err)
  }
};

/**
 * Delete a broker by ID
 * @route DELETE /api/brokers/:id
 * @access Private
 * @param {Request} req - Express request object containing broker ID in params
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 * @returns {Promise<void>} JSON response confirming deletion
 * @throws {AppError} 400 - Invalid broker ID format
 * @throws {AppError} 404 - Broker not found
 */
export const deleteBroker = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    // Validate MongoDB ObjectId format
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
