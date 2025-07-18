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
    min: 0, // Allow free packages
    validate: {
      validator: function(value: number) {
        return Number.isFinite(value) && value >= 0;
      },
      message: 'Price must be a valid non-negative number'
    }
  }
}, {
  timestamps: true
});

// Ensure unique bot-package combinations
botPackageSchema.index({ botId: 1, packageId: 1 }, { unique: true });

const BotPackage = mongoose.model("BotPackage", botPackageSchema);

export default BotPackage;
