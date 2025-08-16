// routes/posts.js
import express from "express";
import multer from "multer";
import { Post } from "../models/Post.js";
import User from "../models/User.js";
import { Readable } from "stream";
import cloudinary from "../config/cloudinaryConfig.js";

const router = express.Router();

// Multer memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Helper to upload buffer to Cloudinary
const uploadToCloudinary = (buffer, folder, filename) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: filename,
        resource_type,  // auto-detects image, video, raw (pdf/docx/zip)
        flags: "attachment:false" // lets browser open instead of download
      },
      (err, result) => {
        if (err) return reject(err);
        resolve(result.secure_url);
      }
    );

    const readable = new Readable();
    readable._read = () => { };
    readable.push(buffer);
    readable.push(null);
    readable.pipe(stream);
  });

/* ---------------- CREATE POST (multiple files) ---------------- */
router.post("/", upload.array("files", 10), async (req, res) => {
  try {
    const { userId, content, visibility } = req.body;
    if (!content) return res.status(400).json({ message: "Content is required" });
    if (!userId) return res.status(400).json({ message: "userId is required" });

    const user = await User.findOne({ userId }).select("username");
    if (!user) return res.status(404).json({ message: "User not found" });

    let images = [];
    let documents = [];

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const resource_type = file.mimetype.startsWith("image/") ? "image" : "raw";
        const url = await uploadToCloudinary(
          file.buffer,
          "posts",
          `${Date.now()}-${file.originalname}`,
          resource_type
        );

        if (resource_type === "image") {
          images.push(url); // store latest uploaded images
        } else {
          documents.push(url); // store PDF/docs in array
        }
      }
    }

    const newPost = new Post({
      userId,
      username: user.username,
      content,
      images,
      documents,
    });

    await newPost.save();
    res.status(201).json({ message: "Post created successfully", post: newPost });
  } catch (error) {
    console.error("Create post error:", error);
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

// GET /api/posts/user/:userId
router.get("/user/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    // Fetch all posts by the specified user
    const posts = await Post.find({ userId }).sort({ createdAt: -1 }).lean();

    // Optional: include likes and comments as stored
    res.json({ posts });
  } catch (error) {
    res.status(500).json({ message: "Error fetching user posts", error: error.message });
  }
});

// DELETE /api/posts/:postId?userId=xxx
router.delete("/:postId", async (req, res) => {
  const { postId } = req.params;
  const userId = req.query.userId; // passed as query

  if (!userId) return res.status(400).json({ message: "userId is required in query" });

  try {
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    // Only owner can delete
    if (post.userId !== userId) return res.status(403).json({ message: "Not authorized" });

    await post.deleteOne();
    res.json({ message: "Post deleted successfully", postId });
  } catch (error) {
    res.status(500).json({ message: "Error deleting post", error: error.message });
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

// GET /api/posts/:postId/likes
router.get("/:postId/likes", async (req, res) => {
  try {
    const { postId } = req.params;

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    // Fetch users by custom userId since likes array stores userId now
    const likedUsers = await User.find({ userId: { $in: post.likes } })
      .select("userId username profilePicture");

    res.json(likedUsers);
  } catch (error) {
    res.status(500).json({ message: "Error fetching liked users", error: error.message });
  }
});

/* ---------------- ADD COMMENT ---------------- */
router.post("/:postId/comment", async (req, res) => {
  try {
    const { userId, text, username } = req.body;
    const { postId } = req.params;

    if (!userId || !text || !username) {
      return res.status(400).json({ message: "userId and text and username are required" });
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
router.delete("/:postId/comment/:commentId", async (req, res) => {
  const { postId, commentId } = req.params;
  const userId = req.query.userId; // ?userId=xxx

  if (!userId) {
    return res.status(400).json({ error: "userId required in query params" });
  }

  try {
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    const comment = post.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({ error: "Comment not found" });
    }

    if (comment.userId.toString() !== userId.toString()) {
      return res.status(403).json({ error: "Not authorized to delete this comment" });
    }

    comment.deleteOne(); // remove subdocument
    await post.save();

    // Fetch users to add user info to comments
    const userIds = [...new Set(post.comments.map(c => c.userId.toString()))];
    const users = await User.find({ userId: { $in: userIds } }).select("userId username profilePicture").lean();
    const userMap = Object.fromEntries(users.map(u => [u.userId, u]));

    const commentsWithUsers = post.comments.map(c => ({
      ...c.toObject(),
      user: userMap[c.userId]
        ? { userId: c.userId, username: userMap[c.userId].username, profilePicture: userMap[c.userId].profilePicture }
        : { userId: c.userId, username: "Unknown", profilePicture: null }
    }));

    res.json({ message: "Comment deleted successfully", comments: commentsWithUsers });

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