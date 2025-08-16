// config/cloudinaryConfig.js
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

// Auto-detect from CLOUDINARY_URL
cloudinary.config({
  secure: true, // optional, forces https
});

console.log("Cloudinary config:", cloudinary.config());

export default cloudinary;
