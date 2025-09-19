// routes/savePost.js
import express from "express";
import User from "../models/User.js";

const router = express.Router();

// Toggle Save / Unsave
router.patch("/:userId/save/:postId", async (req, res) => {
  const { userId, postId } = req.params;

  try {
    const user = await User.findOne({ userId });
    if (!user) return res.status(404).json({ error: "User not found" });

    const alreadySaved = user.savedPosts.some(id => id.toString() === postId);

    if (alreadySaved) {
      // Unsave
      user.savedPosts = user.savedPosts.filter(id => id.toString() !== postId);
    } else {
      // Save
      user.savedPosts.push(postId);
    }

    await user.save();
    res.json({ savedPosts: user.savedPosts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Remove saved post
router.delete("/:userId/:postId", async (req, res) => {
  try {
    const { userId, postId } = req.params;

    const user = await User.findOne({ userId });
    if (!user) return res.status(404).json({ error: "User not found" });

    // Remove the postId from savedPosts array
    user.savedPosts = user.savedPosts.filter(id => id.toString() !== postId);
    await user.save();

    res.json({ message: "Post removed from saved list", savedPosts: user.savedPosts });
  } catch (error) {
    console.error("Error removing saved post:", error);
    res.status(500).json({ error: "Server error" });
  }
});


// Get all saved posts
router.get("/:userId/saved", async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.params.userId });
    if (!user) return res.status(404).json({ error: "User not found" });

    // Fetch all saved posts
    const Post = await import("../models/Post.js").then(m => m.default);

    const posts = await Post.find({ _id: { $in: user.savedPosts } });

    // Fetch all unique users for these posts
    const uniqueUserIds = [...new Set(posts.map(p => p.userId))];
    const users = await User.find({ userId: { $in: uniqueUserIds } });
    const userMap = Object.fromEntries(users.map(u => [u.userId, u]));

    // Attach username and profilePicture
    const savedPosts = posts.map(post => ({
      ...post._doc,
      username: userMap[post.userId]?.username || "Unknown",
      profilePicture: userMap[post.userId]?.profilePicture || "default.png",
    }));

    res.json(savedPosts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
