import mongoose from "mongoose";

const postSchema = new mongoose.Schema({
  userId: {
    type: String,
    ref: "User",
    required: true
  },
  username: {
    type: String, // username of the post creator
    required: true,
  },
  content: {
    type: String,
    required: true
  },
  documents: [
    {
      url: { type: String, required: true },
      downloadUrl: { type: String, required: true }
    }
  ],
  images: [
    {
      url: { type: String, required: true },
      downloadUrl: { type: String, required: true }
    }
  ],
  likes: {
    type: [String], // userIds of people who liked
    default: []
  },
  comments: [
    {
      userId: { type: String, ref: "User", required: true },
      username: { type: String, required: true },
      text: { type: String, required: true },
      createdAt: { type: Date, default: Date.now }
    }
  ],
  shares: {
    type: [String], // userIds of people who shared
    default: []
  }
}, { timestamps: true });

export const Post = mongoose.model("Post", postSchema);
