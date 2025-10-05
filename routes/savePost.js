// routes/savePost.js
import express from "express";
import mongoose from "mongoose";
import User from "../models/User.js";
import { Post } from "../models/Post.js";

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
  const { userId } = req.params;

  try {
    const user = await User.findOne({ userId });
    if (!user) return res.status(404).json({ error: "User not found" });

    if (!user.savedPosts || user.savedPosts.length === 0) return res.json([]);

    // Use MongoDB aggregation with $lookup to fetch posts + user details
    const savedPosts = await Post.aggregate([
      {
        $match: {
          _id: { $in: user.savedPosts.map(id => new mongoose.Types.ObjectId(id)) }
        }
      },
      {
        $lookup: {
          from: "users", // Mongo collection name for User model
          localField: "userId",
          foreignField: "userId",
          as: "userDetails"
        }
      },
      { $unwind: "$userDetails" },
      {
        $project: {
          _id: 1,
          userId: 1,
          content: 1,
          images: 1,
          likes: 1,
          comments: 1,
          shares: 1,
          createdAt: 1,
          username: "$userDetails.username",
          profilePicture: "$userDetails.profilePicture"
        }
      }
    ]);

    res.json(savedPosts);
  } catch (err) {
    console.error("Error fetching saved posts:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;