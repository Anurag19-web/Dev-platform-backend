// routes/posts.js
import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { Post } from "../models/Post.js";
import User from "../models/User.js";

const router = express.Router();

// Ensure "uploads" folder exists
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});
const upload = multer({ storage });

/* ---------------- CREATE POST ---------------- */
router.post("/", upload.single("image"), async (req, res) => {
  try {
    const { userId, content } = req.body;
    if (!content) return res.status(400).json({ message: "Content is required" });
    if (!userId) return res.status(400).json({ message: "userId is required" });

    let imagePath = null;
    if (req.file) imagePath = `/uploads/${req.file.filename}`;

    const newPost = new Post({ userId, content, image: imagePath });
    await newPost.save();

    res.status(201).json({ message: "Post created successfully", post: newPost });
  } catch (error) {
    res.status(500).json({ message: "Error creating post", error: error.message });
  }
});

/* ---------------- GET ALL POSTS ---------------- */
router.get("/", async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 }).lean();

    const userIds = [
      ...new Set([
        ...posts.map(p => p.userId),
        ...posts.flatMap(p => p.likes),
        ...posts.flatMap(p => (p.comments || []).map(c => c.userId))
      ])
    ];

    const users = await User.find({ userId: { $in: userIds } })
      .select("userId username profilePicture email")
      .lean();
    const userMap = Object.fromEntries(users.map(u => [u.userId, u]));

    const postsWithDetails = posts.map(post => {
      const user = userMap[post.userId] || { userId: post.userId, username: "Unknown", profilePicture: null, email: "" };
      const likes = (post.likes || []).map(uid => {
        const u = userMap[uid];
        return u ? { userId: uid, username: u.username, profilePicture: u.profilePicture } : { userId: uid, username: "Unknown", profilePicture: null };
      });
      const comments = (post.comments || []).map(c => ({
        ...c,
        user: userMap[c.userId]
          ? { userId: c.userId, username: userMap[c.userId].username, profilePicture: userMap[c.userId].profilePicture }
          : { userId: c.userId, username: "Unknown", profilePicture: null }
      }));
      return { ...post, user, likes, comments };
    });

    res.json({ posts: postsWithDetails });
  } catch (error) {
    res.status(500).json({ message: "Error fetching posts", error: error.message });
  }
});

/* ---------------- LIKE / UNLIKE ---------------- */
router.post("/:postId/like", async (req, res) => {
  try {
    const { userId } = req.body;
    const { postId } = req.params;
    if (!userId) return res.status(400).json({ message: "userId required" });

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    if (!post.likes.includes(userId)) {
      post.likes.push(userId);
      await post.save();
    }
    res.json({ message: "Post liked", likes: post.likes });
  } catch (error) {
    res.status(500).json({ message: "Error liking post", error: error.message });
  }
});

router.post("/:postId/unlike", async (req, res) => {
  try {
    const { userId } = req.body;
    const { postId } = req.params;
    if (!userId) return res.status(400).json({ message: "userId required" });

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    post.likes = post.likes.filter(id => id !== userId);
    await post.save();

    res.json({ message: "Post unliked", likes: post.likes });
  } catch (error) {
    res.status(500).json({ message: "Error unliking post", error: error.message });
  }
});

/* ---------------- ADD COMMENT ---------------- */
router.post("/:postId/comment", async (req, res) => {
  try {
    const { userId, text } = req.body;
    const { postId } = req.params;

    if (!userId || !text) {
      return res.status(400).json({ message: "userId and text are required" });
    }

    // Find user to get username
    const user = await User.findOne({ userId }).select("username profilePicture");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Store username inside the comment
    post.comments.push({
      userId,
      username: user.username,
      text
    });

    await post.save();

    // Return comments with user info
    const commentsWithUsers = post.comments.map(c => ({
      ...c.toObject(),
      user: {
        userId: c.userId,
        username: c.username, // Already stored
        profilePicture: userId === c.userId ? user.profilePicture : null
      }
    }));

    res.json({ message: "Comment added", comments: commentsWithUsers });
  } catch (error) {
    res.status(500).json({ message: "Error adding comment", error: error.message });
  }
});

/* ---------------- DELETE COMMENT ---------------- */
// DELETE COMMENT
router.delete("/:postId/comment/:commentId", async (req, res) => {
  const { postId, commentId } = req.params;
  const userId = req.query.userId; // ?userId=xxx

  if (!userId) {
    return res.status(400).json({ error: "userId required in query params" });
  }

  try {
    // 1. Find post
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    // 2. Find comment
    const comment = post.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({ error: "Comment not found" });
    }

    // 3. Authorization check (handle both String & ObjectId cases)
    if (comment.userId.toString() !== userId.toString()) {
      return res.status(403).json({ error: "Not authorized to delete this comment" });
    }

    // 4. Remove comment
    comment.deleteOne(); // Mongoose subdocument removal

    // 5. Save post
    await post.save();

    res.json({ message: "Comment deleted successfully" });

  } catch (error) {
    console.error("Delete comment error:", error.stack);
    res.status(500).json({ error: "Server error" });
  }
});



/* ---------------- GET SINGLE POST ---------------- */
router.get("/:postId", async (req, res) => {
  try {
    const { postId } = req.params;
    const post = await Post.findById(postId).lean();
    if (!post) return res.status(404).json({ message: "Post not found" });

    const ids = [
      post.userId,
      ...(post.likes || []),
      ...(post.comments || []).map(c => c.userId)
    ];

    const users = await User.find({ userId: { $in: ids } }).select("userId username profilePicture email").lean();
    const userMap = Object.fromEntries(users.map(u => [u.userId, u]));

    const user = userMap[post.userId] || { userId: post.userId, username: "Unknown", profilePicture: null, email: "" };
    const likes = (post.likes || []).map(uid => {
      const u = userMap[uid];
      return u ? { userId: uid, username: u.username, profilePicture: u.profilePicture } : { userId: uid, username: "Unknown", profilePicture: null };
    });
    const comments = (post.comments || []).map(c => ({
      ...c,
      user: userMap[c.userId]
        ? { userId: c.userId, username: userMap[c.userId].username, profilePicture: userMap[c.userId].profilePicture }
        : { userId: c.userId, username: "Unknown", profilePicture: null }
    }));

    res.json({ ...post, user, likes, comments });
  } catch (error) {
    res.status(500).json({ message: "Error fetching post", error: error.message });
  }
});

export default router;
