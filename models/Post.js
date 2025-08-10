import mongoose from "mongoose";

const postSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  content: {
    type: String,
    required: true
  },
  image: {
    type: String, // optional image URL
  },
  likes: {
    type: [String], // userIds of people who liked
    default: []
  },
  comments: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      text: String,
      createdAt: { type: Date, default: Date.now }
    }
  ],
}, { timestamps: true });

export const Post = mongoose.model("Post", postSchema);
