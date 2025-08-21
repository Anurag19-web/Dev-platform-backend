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

// ✅ GET user profile (fetch privacy setting)
router.get("/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("username email isPrivate");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// ✅ Toggle privacy
router.patch("/users/:id/privacy", async (req, res) => {
  try {
    const { id } = req.params;
    const { isPrivate } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { isPrivate },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ isPrivate: updatedUser.isPrivate });
  } catch (err) {
    console.error("Privacy update error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

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

// New route to get visible users
router.get("/visible-users/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    // logged-in user
    const loggedInUser = await User.findOne({ userId });
    if (!loggedInUser) return res.status(404).json({ message: "User not found" });

    // get all users
    const allUsers = await User.find();

    // filter based on privacy rules
    const visibleUsers = await User.find({
      $or: [
        { isPrivate: false },
        { isPrivate: true, followers: loggedInUser.userId }
      ],
      userId: { $ne: loggedInUser.userId }
    });

    res.json(visibleUsers);
  } catch (err) {
    console.error("Visible Users Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ FOLLOW a user
router.patch("/users/:id/follow", async (req, res) => {
  const targetId = req.params.id;
  const { userId } = req.body;

  // ✅ Stronger userId validation
  if (!userId || typeof userId !== "string" || userId.trim() === "" || userId === "null" || userId === "undefined") {
    return res.status(400).json({ message: "Invalid userId in request body" });
  }

  if (userId === targetId) {
    return res.status(400).json({ message: "You cannot follow yourself" });
  }

  try {
    // ✅ Find both users
    const user = await User.findOne({ userId });
    const target = await User.findOne({ userId: targetId });

    if (!user || !target) {
      return res.status(404).json({ message: "User not found" });
    }

    // ✅ Use MongoDB atomic $addToSet to avoid duplicates + nulls
    await User.updateOne(
      { userId: targetId },
      { $addToSet: { followers: userId } }
    );

    await User.updateOne(
      { userId },
      { $addToSet: { following: targetId } }
    );

    // ✅ Return updated follower list
    const updatedTarget = await User.findOne({ userId: targetId });

    res.status(200).json({
      message: "Followed successfully",
      followers: updatedTarget.followers,
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

// ✅ GET followers and following together
router.get("/users/:id/network", async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.params.id });
    if (!user) return res.status(404).json({ message: "User not found" });

    const followers = await User.find({ userId: { $in: [...new Set(user.followers)] } })
      .select("userId username email profilePicture");

    const following = await User.find({ userId: { $in: [...new Set(user.following)] } })
      .select("userId username email profilePicture");


    res.status(200).json({ followers, following });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch network", error: error.message });
  }
});

export default router;