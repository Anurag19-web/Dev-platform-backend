import express from "express";
import multer from "multer";
import path from "path";
import User from "../models/User.js";

const router = express.Router();

// Multer storage config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage });


// ✅ Update profile data
router.patch("/users/:id", async (req, res) => {
  try {
    const updatedUser = await User.findOneAndUpdate(
      { userId: req.params.id },
      { $set: req.body },
      { new: true }
    );

    if (!updatedUser) return res.status(404).json({ message: "User not found" });

    res.status(200).json({ message: "Profile updated", user: updatedUser });
  } catch (error) {
    res.status(500).json({ message: "Update error", error: error.message });
  }
});


// ✅ Upload profile picture
router.patch("/users/:id/profile-picture", upload.single("profilePicture"), async (req, res) => {
  try {
    const imagePath = req.file ? `/uploads/${req.file.filename}` : "";

    const updatedUser = await User.findOneAndUpdate(
      { userId: req.params.id },
      { profilePicture: imagePath },
      { new: true }
    );

    if (!updatedUser) return res.status(404).json({ message: "User not found" });

    res.status(200).json({ message: "Profile picture updated", user: updatedUser });
  } catch (err) {
    res.status(500).json({ message: "Image upload failed", error: err.message });
  }
});


// ✅ FOLLOW a user
router.patch("/users/:id/follow", async (req, res) => {
  const targetId = req.params.id;
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ message: "Missing userId in request body" });
  }

  if (userId === targetId) {
    return res.status(400).json({ message: "You cannot follow yourself" });
  }

  try {
    const user = await User.findOne({ userId });
    const target = await User.findOne({ userId: targetId });

    if (!user || !target) {
      return res.status(404).json({ message: "User not found" });
    }

    // Avoid duplicates
    if (!target.followers.includes(userId)) {
      target.followers.push(userId);
      user.following.push(targetId);

      await target.save();
      await user.save();
    }

    res.status(200).json({
      message: "Followed successfully",
      followers: target.followers,
    });
  } catch (err) {
    res.status(500).json({ message: "Follow failed", error: err.message });
  }
});


// ✅ UNFOLLOW a user
router.patch("/users/:id/unfollow", async (req, res) => {
  const targetId = req.params.id;
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ message: "Missing userId in request body" });
  }

  if (userId === targetId) {
    return res.status(400).json({ message: "You cannot unfollow yourself" });
  }

  try {
    const user = await User.findOne({ userId });
    const target = await User.findOne({ userId: targetId });

    if (!user || !target) {
      return res.status(404).json({ message: "User not found" });
    }

    target.followers = target.followers.filter((id) => id !== userId);
    user.following = user.following.filter((id) => id !== targetId);

    await target.save();
    await user.save();

    res.status(200).json({
      message: "Unfollowed successfully",
      followers: target.followers,
    });
  } catch (err) {
    res.status(500).json({ message: "Unfollow failed", error: err.message });
  }
});

export default router;
