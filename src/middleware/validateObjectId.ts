import mongoose from 'mongoose';
import { Request, Response, NextFunction } from 'express';

export const validateObjectId = (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: 'Invalid ID format' });
  }

 return next(); 
};
