import mongoose from "mongoose";

const imageSchema = new mongoose.Schema({
  hash: { type: String, unique: true, required: true },
  url: { type: String, required: true },
  public_id: { type: String, required: true }
});

const Image = mongoose.model("Image", imageSchema);
export default Image;