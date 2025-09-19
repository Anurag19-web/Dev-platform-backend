// models/User.js
import mongoose from "mongoose";
import { Post } from "./Post";

const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  email:    { type: String, required: true, unique: true },
  password: { type: String, required: true },
  isPrivate: { type: Boolean, default: false },
  bio:            { type: String, default: "" },
  skills:         { type: [String], default: [] },
  experience: [
  {
    company: { type: String },
    role: { type: String },
    duration: { type: String },
  }
],
  github:         { type: String, default: "" },
  linkedin:       { type: String, default: "" },
  profilePicture: { type: String, default: "" },
  followers:      { type: [String], default: [] },
  following:      { type: [String], default: [] },
  savedPosts: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post"
    }
  ]
}, { timestamps: true });

/* ------------------ Middleware to update comments on username/profilePicture change ------------------ */
userSchema.pre('save', async function(next) {
  try {
    // Check if username or profilePicture is modified
    if (this.isModified('username') || this.isModified('profilePicture')) {
      await Post.updateMany(
        { "comments.userId": this.userId },
        { 
          $set: { 
            "comments.$[elem].username": this.username, 
            "comments.$[elem].profilePicture": this.profilePicture 
          } 
        },
        { arrayFilters: [{ "elem.userId": this.userId }] }
      );
    }
    next();
  } catch (err) {
    console.error("Error updating comments on user update:", err);
    next(err);
  }
});

const User = mongoose.model("User", userSchema);
export default User;