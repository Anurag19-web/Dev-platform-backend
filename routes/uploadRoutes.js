import express from "express";
import multer from "multer";
import fs from "fs";
import cloudinary from "../config/cloudinaryConfig.js";
import ImageCollection from "../models/Image.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

// No fixed limit, but you can set a very high number
router.post("/upload-many", upload.array("files", 1000), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) throw new Error("No files uploaded");

    const uploadedImages = [];

    for (const file of req.files) {
      const result = await cloudinary.uploader.upload(file.path, {
        folder: "my_app_images",
      });

      fs.unlinkSync(file.path); // delete temp file
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

export default router;