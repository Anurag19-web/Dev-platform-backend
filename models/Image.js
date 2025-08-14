import mongoose from "mongoose";

const ImageSchema = new mongoose.Schema({
  url: String,
  public_id: String
});

export default mongoose.model("Image", ImageSchema);
