import express from "express";
import multer from "multer";
import { Post } from "../models/Post.js";
import { User } from "../models/User.js"; // Assuming you have User model

const router = express.Router();

// Setup multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"), // make sure uploads/ folder exists
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  }
});
const upload = multer({ storage });

// Create Post with optional image upload
router.post("/", upload.single("image"), async (req, res) => {
  try {
    const { userId, content } = req.body;

    if (!content) {
      return res.status(400).json({ message: "Content is required" });
    }

    let imagePath = null;
    if (req.file) {
      imagePath = `/uploads/${req.file.filename}`; 
    }

    const newPost = new Post({
      userId,
      content,
      image: imagePath,
    });

    await newPost.save();
    res.status(201).json({ message: "Post created successfully", post: newPost });
  } catch (error) {
    res.status(500).json({ message: "Error creating post", error: error.message });
  }
});

// Get all posts
router.get("/", async (req, res) => {
  try {
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .lean();

    // Optional: populate user data for likes and comments (replace userIds with user data)
    const postsWithUserDetails = await Promise.all(posts.map(async (post) => {
      // Fetch user who created the post
      const user = await User.findById(post.userId).select("username avatar email").lean();

      // Fetch user info for each like userId
      const likesWithUser = await Promise.all(
        post.likes.map(async (userId) => {
          const u = await User.findById(userId).select("username avatar").lean();
          return u ? { _id: userId, username: u.username, avatar: u.avatar } : { _id: userId, username: "Unknown", avatar: null };
        })
      );

      // Fetch user info for each comment userId
      const commentsWithUser = await Promise.all(
        post.comments.map(async (comment) => {
          const u = await User.findById(comment.userId).select("username avatar").lean();
          return {
            ...comment,
            user: u ? { _id: comment.userId, username: u.username, avatar: u.avatar } : { _id: comment.userId, username: "Unknown", avatar: null }
          };
        })
      );

      return {
        ...post,
        user,
        likes: likesWithUser,
        comments: commentsWithUser,
      };
    }));

    res.json({ posts: postsWithUserDetails });
  } catch (error) {
    res.status(500).json({ message: "Error fetching posts", error: error.message });
  }
});

// Like a post
router.post("/:postId/like", async (req, res) => {
  try {
    const { userId } = req.body;
    const { postId } = req.params;
    if (!userId) return res.status(400).json({ message: "userId required" });

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    // Add userId to likes array if not already there
    if (!post.likes.includes(userId)) {
      post.likes.push(userId);
      await post.save();
    }
    res.json({ message: "Post liked", likes: post.likes });
  } catch (error) {
    res.status(500).json({ message: "Error liking post", error: error.message });
  }
});

// Unlike a post
router.post("/:postId/unlike", async (req, res) => {
  try {
    const { userId } = req.body;
    const { postId } = req.params;
    if (!userId) return res.status(400).json({ message: "userId required" });

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    // Remove userId from likes array if present
    post.likes = post.likes.filter(id => id !== userId);
    await post.save();

    res.json({ message: "Post unliked", likes: post.likes });
  } catch (error) {
    res.status(500).json({ message: "Error unliking post", error: error.message });
  }
});

// Add a comment
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

// Get single post with populated likes and comments users
router.get("/:postId", async (req, res) => {
  try {
    const { postId } = req.params;
    const post = await Post.findById(postId).lean();
    if (!post) return res.status(404).json({ message: "Post not found" });

    const user = await User.findById(post.userId).select("username avatar email").lean();

    const likesWithUser = await Promise.all(
      post.likes.map(async (userId) => {
        const u = await User.findById(userId).select("username avatar").lean();
        return u ? { _id: userId, username: u.username, avatar: u.avatar } : { _id: userId, username: "Unknown", avatar: null };
      })
    );

    const commentsWithUser = await Promise.all(
      post.comments.map(async (comment) => {
        const u = await User.findById(comment.userId).select("username avatar").lean();
        return {
          ...comment,
          user: u ? { _id: comment.userId, username: u.username, avatar: u.avatar } : { _id: comment.userId, username: "Unknown", avatar: null }
        };
      })
    );

    res.json({ ...post, user, likes: likesWithUser, comments: commentsWithUser });
  } catch (error) {
    res.status(500).json({ message: "Error fetching post", error: error.message });
  }
});

export default router;