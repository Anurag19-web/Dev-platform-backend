// models/User.js
import mongoose from "mongoose";

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

// Pre-save hook to update all comments when username or profilePicture changes
userSchema.pre('save', async function(next) {
  if (this.isModified('username') || this.isModified('profilePicture')) {
    try {
      // Dynamic import to avoid circular dependency
      const PostModule = await import('./Post.js');
      const Post = PostModule.default;

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
    } catch (err) {
      console.error("Error updating comments in posts:", err);
    }
  }
  next();
});

const User = mongoose.model("User", userSchema);
export default User;
