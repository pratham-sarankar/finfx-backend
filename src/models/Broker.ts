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
      minlength: [2, "Broker name must be at least 2 characters"],
      maxlength: [100, "Broker name cannot exceed 100 characters"],
      validate: {
        validator: function(value: string) {
          return /^[a-zA-Z0-9\s&.-]+$/.test(value);
        },
        message: "Broker name contains invalid characters"
      }
    },
  },
  {
    timestamps: true, 
  }
);

const Broker = mongoose.model<IBroker>("Broker", brokerSchema);

export default Broker; 