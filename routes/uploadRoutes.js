import express from "express";
import multer from "multer";
import fs from "fs";
import cloudinary from "../config/cloudinaryConfig.js";
import ImageCollection from "../models/Image.js";
import User from "../models/User.js"; // ✅ make sure you have User model

const router = express.Router();

// Multer setup (temp folder)
const upload = multer({ dest: "uploads/" });

/**
 * 1️⃣ Bulk upload many images (gallery, posts, etc.)
 * Endpoint: POST /upload-many
 */
router.post("/upload-many", upload.array("files", 1000), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) throw new Error("No files uploaded");

    const uploadedImages = [];

    for (const file of req.files) {
      const result = await cloudinary.uploader.upload(file.path, {
        folder: "my_app_images",
      });

      fs.unlinkSync(file.path); // delete local temp file

      uploadedImages.push({
        url: result.secure_url,
        public_id: result.public_id,
      });
    }

    const savedDocument = await ImageCollection.create({ images: uploadedImages });
    res.json(savedDocument);
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 2️⃣ Upload single profile picture (updates User document)
 * Endpoint: POST /upload-profile
 */
router.post("/upload-profile", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) throw new Error("No file uploaded");

    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "profile_pictures",
    });

    fs.unlinkSync(req.file.path); // delete temp file

    const { userId } = req.body; // ✅ frontend must send userId

    const updatedUser = await User.findOneAndUpdate(
      { userId }, // matching with custom userId
      { profilePicture: result.secure_url },
      { new: true }
    );

    if (!updatedUser) throw new Error("User not found");

    res.json({
      message: "Profile picture updated",
      url: result.secure_url, // <-- this is what frontend expects
      public_id: result.public_id,
      user: updatedUser,
    });

  } catch (error) {
    console.error("Profile upload error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
