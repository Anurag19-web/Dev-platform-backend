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


// Get all saved posts with dynamic username & profilePicture
router.get("/:userId/saved", async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findOne({ userId });
    if (!user) return res.status(404).json({ error: "User not found" });

    // Import Post model dynamically
    const Post = await import("../models/Post.js").then(m => m.default);

    // Fetch posts using saved post IDs
    const posts = await Post.find({ _id: { $in: user.savedPosts } });

    if (!posts.length) return res.json([]);

    // Get all unique userIds from posts
    const uniqueUserIds = [...new Set(posts.map(p => p.userId))];

    // Fetch user details for these posts
    const users = await User.find({ userId: { $in: uniqueUserIds } });
    const userMap = Object.fromEntries(users.map(u => [u.userId, u]));

    // Map posts with username & profilePicture dynamically
    const savedPosts = posts.map(post => ({
      ...post._doc,
      username: userMap[post.userId]?.username || "Unknown",
      profilePicture: userMap[post.userId]?.profilePicture || "default.png",
    }));

    res.json(savedPosts);
  } catch (err) {
    console.error("Error fetching saved posts:", err);
    res.status(500).json({ error: "Server error" });
  }
});


export default router;
