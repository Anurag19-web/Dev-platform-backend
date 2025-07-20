// routes/users.js
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

// PATCH /api/users/:id — Update profile data
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

// PATCH /api/users/:id/profile-picture — Upload profile picture
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

export default router;
