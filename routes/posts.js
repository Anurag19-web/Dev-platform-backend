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

// Setup multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    // Only safe extension, no original name for security
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});
const upload = multer({ storage });

// --- Create Post (with optional image) ---
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

// --- Get All Posts (with user, likes, comments user info) ---
router.get("/", async (req, res) => {
  try {
    // Find posts newest first
    const posts = await Post.find().sort({ createdAt: -1 }).lean();

    // Get all related userIds
    const userIds = [
      ...new Set([
        ...posts.map(p => p.userId),
        ...posts.flatMap(p => p.likes),
        ...posts.flatMap(p => (p.comments || []).map(c => c.userId))
      ])
    ];

    // Get all users at once (for fast mapping)
    const users = await User.find({ userId: { $in: userIds } }).select("userId username profilePicture email").lean();
    const userMap = Object.fromEntries(users.map(u => [u.userId, u]));

    // Attach user info to each post/like/comment
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

// --- Like a Post ---
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

// --- Unlike a Post ---
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

router.get("/:postId/likes", async (req, res) => {
  try {
    const { postId } = req.params;
    const post = await Post.findById(postId).lean();
    if (!post) return res.status(404).json({ message: "Post not found" });

    const users = await User.find({ userId: { $in: post.likes } })
      .select("userId username profilePicture")
      .lean();

    res.json({ likes: users });
  } catch (error) {
    res.status(500).json({ message: "Error fetching likes", error: error.message });
  }
});


// --- Add a Comment ---
router.post("/:postId/comment", async (req, res) => {
  try {
    const { userId, text } = req.body;
    const { postId } = req.params;
    if (!userId || !text) return res.status(400).json({ message: "userId and text are required" });

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    post.comments.push({ userId, text });
    await post.save();

    res.json({ message: "Comment added", comments: post.comments });
  } catch (error) {
    res.status(500).json({ message: "Error adding comment", error: error.message });
  }
});

router.delete("/posts/:postId/comment/:commentId", async (req, res) => {
  const { postId, commentId } = req.params;
  const { userId } = req.body;

  try {
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ error: "Post not found" });

    const comment = post.comments.id(commentId);
    if (!comment) return res.status(404).json({ error: "Comment not found" });

    // Allow delete only if the comment belongs to the logged-in user
    if (comment.user.userId !== userId) {
      return res.status(403).json({ error: "Not authorized" });
    }

    comment.remove();
    await post.save();

    res.json({ comments: post.comments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// --- Get Single Post w/ User & Likes/Comments User Info ---
router.get("/:postId", async (req, res) => {
  try {
    const { postId } = req.params;
    const post = await Post.findById(postId).lean();
    if (!post) return res.status(404).json({ message: "Post not found" });

    // Gather related userIds
    const ids = [
      post.userId,
      ...(post.likes || []),
      ...(post.comments || []).map(c => c.userId)
    ];

    // Pull all users in 1 query
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
