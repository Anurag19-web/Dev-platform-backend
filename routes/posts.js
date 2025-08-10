import express from "express";
import { Post } from "../models/Post.js";

const router = express.Router();

// Create Post
router.post("/", async (req, res) => {
  try {
    const { userId, content, image } = req.body;

    if (!content) {
      return res.status(400).json({ message: "Content is required" });
    }

    const newPost = new Post({ userId, content, image });
    await newPost.save();

    res.status(201).json({ message: "Post created successfully", post: newPost });
  } catch (error) {
    res.status(500).json({ message: "Error creating post", error: error.message });
  }
});

export default router;
