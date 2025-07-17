import mongoose from "mongoose";

const packageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  duration: {
    type: Number,
    required: true,
    min: 1
  }
});

const Package = mongoose.model("Package", packageSchema);

export default Package;

