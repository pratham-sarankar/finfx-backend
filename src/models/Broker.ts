import mongoose, { Document } from "mongoose";

export interface IBroker extends Document {
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

const brokerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Broker name is required"],
      trim: true,
      unique: true,

    },
  },
  {
    timestamps: true, 
  }
);

const Broker = mongoose.model<IBroker>("Broker", brokerSchema);

export default Broker; 