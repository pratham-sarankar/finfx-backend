import mongoose from "mongoose";

const platformCredentialSchema = new mongoose.Schema({
userId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "User", 
  required: true,
},
platformName: {
  type: String,
  required: true,
  enum: ["MT4", "MT5", "TradingView", "Binance"]
}
,
 credentials:{
  type:mongoose.Schema.Types.Mixed,
  required:true
 }
},{timestamps:true})

// Compound index 

platformCredentialSchema.index({userId:1, platformName:1},{unique:true});

const platformCredential = mongoose.model("platformCredential",platformCredentialSchema)

export default platformCredential