import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, // from your Cloudinary dashboard
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

console.log("Cloudinary Key:", process.env.CLOUDINARY_API_KEY);
console.log("Cloudinary Secret:", process.env.CLOUDINARY_API_SECRET);


export default cloudinary;
