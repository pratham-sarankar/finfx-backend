import mongoose from "mongoose";

const botPackageSchema = new mongoose.Schema({
  botId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Bot",
    required: true
  },
  packageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Package",
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0.01
  }
});

const BotPackage = mongoose.model("BotPackage", botPackageSchema);

export default BotPackage;
