import express from "express";
import multer from "multer";
import { Post } from "../models/Post.js";

const router = express.Router();

// Setup multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"), // make sure uploads/ folder exists
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  }
});
const upload = multer({ storage });

// Create Post with optional image upload
router.post("/", upload.single("image"), async (req, res) => {
  try {
    const { userId, content } = req.body;

    if (!content) {
      return res.status(400).json({ message: "Content is required" });
    }

    // If image uploaded, multer saves info in req.file
    let imagePath = null;
    if (req.file) {
      imagePath = `/uploads/${req.file.filename}`; // or full URL if needed
    }

    const newPost = new Post({
      userId,
      content,
      image: imagePath,
    });

    await newPost.save();
    res.status(201).json({ message: "Post created successfully", post: newPost });
  } catch (error) {
    res.status(500).json({ message: "Error creating post", error: error.message });
  }
});

// Get all posts
router.get("/", async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.json({ posts });
  } catch (error) {
    res.status(500).json({ message: "Error fetching posts", error: error.message });
  }
});

export default router;
