import express from "express";
import multer from "multer";
import crypto from "crypto";
import { Post } from "../models/Post.js";
import Image from "../models/Image.js";
import User from "../models/User.js";
import { Readable } from "stream";
import cloudinary from "../config/cloudinaryConfig.js";

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

function getBufferHash(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

// Helper to upload buffer to Cloudinary
const uploadToCloudinary = (buffer, folder, filename, resource_type, mimetype) =>
  new Promise((resolve, reject) => {
    const options = {
      folder,
      public_id: filename.replace(/\.[^/.]+$/, ""), // strip ext
      resource_type: "auto",
      type: "upload",
    };

    const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });

    const readable = new Readable();
    readable._read = () => { };
    readable.push(buffer);
    readable.push(null);
    readable.pipe(stream);
  });

/* ---------------- CREATE POST (images only) ---------------- */
router.post("/", upload.array("files", 10), async (req, res) => {
  try {
    const { userId, content, visibility } = req.body;
    if (!content) return res.status(400).json({ message: "Content is required" });
    if (!userId) return res.status(400).json({ message: "userId is required" });

    const user = await User.findOne({ userId }).select("username profilePicture");
    if (!user) return res.status(404).json({ message: "User not found" });

    let images = [];

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        // ✅ Allow only image mimetypes
        if (!file.mimetype.startsWith("image/")) {
          return res.status(400).json({ message: "Only image uploads are allowed" });
        }

        const imageHash = getBufferHash(file.buffer);

        // Check if image with this hash already uploaded
        let existingImage = await Image.findOne({ hash: imageHash });

        if (existingImage) {
          // Reuse existing Cloudinary info
          images.push({
            url: existingImage.url,
            downloadUrl: existingImage.url,
            public_id: existingImage.public_id,
            hash: imageHash
          });
        } else {
          // Upload new image
          const result = await uploadToCloudinary(
            file.buffer,
            "posts",
            `${Date.now()}-${file.originalname}`
          );
          // Save in Image collection
          await Image.create({
            hash: imageHash,
            url: result.secure_url,
            public_id: result.public_id
          });
          images.push({
            url: result.secure_url,
            downloadUrl: result.secure_url,
            public_id: result.public_id,
            hash: imageHash
          });
        }
      }
    }

    const newPost = new Post({
      userId,
      // username: user.username,
      // profilePicture: user.profilePicture,
      content,
      images,
    });

    await newPost.save();
    res.status(201).json({ message: "Post created successfully", post: newPost });
  } catch (error) {
    console.error("Create post error:", error);
    res.status(500).json({ message: "Error creating post", error: error.message });
  }
});

// get posts of a user (respect privacy & follow)
router.post("/user/:id", async (req, res) => {
  try {
    const { id } = req.params;     // profile owner
    const { userId } = req.body;   // logged-in user

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // check privacy
    if (
      user.isPrivate &&
      user._id.toString() !== userId && // not the owner
      !user.followers.includes(userId) // not a follower
    ) {
      return res
        .status(403)
        .json({ message: "This account is private. Follow to see posts." });
    }

    const posts = await Post.aggregate([
      { $match: { userId: id } },
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "userId",
          as: "userInfo"
        }
      },
      { $unwind: "$userInfo" },
      {
        $project: {
          content: 1,
          images: 1,
          likes: 1,
          comments: 1,
          createdAt: 1,
          updatedAt: 1,
          userId: 1,
          username: "$userInfo.username",
          profilePicture: "$userInfo.profilePicture"
        }
      }
    ]);

    res.json(posts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Feed route: followed first, then others
router.get("/feed/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findOne({ userId });
    if (!user) return res.status(404).json({ message: "User not found" });

    const followingIds = user.following || [];

    // 1. Posts from followed users + self
    const followedPosts = await Post.aggregate([
      { $match: { userId: { $in: [...followingIds, userId] } } },
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "userId",
          as: "userInfo"
        }
      },
      { $unwind: "$userInfo" },
      {
        $project: {
          content: 1,
          images: 1,
          likes: 1,
          comments: 1,
          createdAt: 1,
          updatedAt: 1,
          userId: 1,
          username: "$userInfo.username",
          profilePicture: "$userInfo.profilePicture"
        }
      }
    ]);

    // 2. Posts from everyone else
    const otherPosts = await Post.aggregate([
      { $match: { userId: { $nin: [...followingIds, userId] } } },
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "userId",
          as: "userInfo"
        }
      },
      { $unwind: "$userInfo" },
      {
        $project: {
          content: 1,
          images: 1,
          likes: 1,
          comments: 1,
          createdAt: 1,
          updatedAt: 1,
          userId: 1,
          username: "$userInfo.username",
          profilePicture: "$userInfo.profilePicture"
        }
      }
    ]);

    // 3. Merge: followed first, then others
    const posts = [...followedPosts, ...otherPosts];

    res.json({ posts });
  } catch (err) {
    console.error("Feed error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ---------------- GET ALL POSTS ---------------- */
router.get("/", async (req, res) => {
  try {
    const posts = await Post.aggregate([
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "userId",
          as: "userInfo"
        }
      },
      { $unwind: "$userInfo" },
      {
        $project: {
          content: 1,
          images: 1,
          likes: 1,
          comments: 1,
          createdAt: 1,
          updatedAt: 1,
          userId: 1,
          username: "$userInfo.username",
          profilePicture: "$userInfo.profilePicture"
        }
      }
    ]);

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
    const posts = await Post.aggregate([
      { $match: { userId } },
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "userId",
          as: "userInfo"
        }
      },
      { $unwind: "$userInfo" },
      {
        $project: {
          content: 1,
          images: 1,
          likes: 1,
          comments: 1,
          createdAt: 1,
          updatedAt: 1,
          userId: 1,
          username: "$userInfo.username",
          profilePicture: "$userInfo.profilePicture"
        }
      }
    ]);

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

    // ✅ delete images from Cloudinary
    for (const img of post.images) {
      if (img.public_id) {
        await cloudinary.uploader.destroy(img.public_id);
      }
    }

    await post.deleteOne();
    res.json({ message: "Post deleted successfully", postId });
  } catch (error) {
    res.status(500).json({ message: "Error deleting post", error: error.message });
  }
});

// Update post (content + replace/delete images)
router.put("/:postId", upload.array("files", 10), async (req, res) => {
  const { postId } = req.params;
  const { userId, content, removeImages } = req.body; // `removeImages` is optional flag

  if (!userId) {
    return res.status(400).json({ message: "userId is required" });
  }

  try {
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    if (post.userId !== userId) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (content) {
      post.content = content;
    }

    if (removeImages && Array.isArray(removeImages)) {
      for (const identifier of removeImages) {
        const img = post.images.find(
          img => img._id.toString() === identifier || img.public_id === identifier
        );
        if (img && img.public_id) {
          await cloudinary.uploader.destroy(img.public_id);
          // Optionally, remove from Image collection based on hash or public_id, if you want to clean up
          await Image.deleteOne({ public_id: img.public_id });
        }
      }
      post.images = post.images.filter(
        img => !removeImages.includes(img._id.toString()) && !removeImages.includes(img.public_id)
      );
    }

    if (req.files && req.files.length > 0) {
      let newImages = [];

      // Get existing hashes
      const existingImageHashes = post.images.map(img => img.hash);

      for (const file of req.files) {
        if (!file.mimetype.startsWith("image/")) {
          return res.status(400).json({ message: "Only image uploads are allowed" });
        }

        const imageHash = getBufferHash(file.buffer);

        if (existingImageHashes.includes(imageHash)) {
          // Already in post images, skip upload & avoid duplicate in post array
          continue;
        }

        let existingImage = await Image.findOne({ hash: imageHash });

        if (existingImage) {
          // Reuse existing Cloudinary info
          newImages.push({
            url: existingImage.url,
            downloadUrl: existingImage.url,
            public_id: existingImage.public_id,
            hash: imageHash
          });
        } else {
          // Upload new image
          const result = await uploadToCloudinary(
            file.buffer,
            "posts",
            `${Date.now()}-${file.originalname}`
          );

          await Image.create({
            hash: imageHash,
            url: result.secure_url,
            public_id: result.public_id
          });

          newImages.push({
            url: result.secure_url,
            downloadUrl: result.secure_url,
            public_id: result.public_id,
            hash: imageHash
          });
        }
      }

      post.images = [...post.images, ...newImages];
    }

    await post.save();
    res.json({ message: "Post updated successfully", post });
  } catch (error) {
    console.error("Error updating post:", error);
    res.status(500).json({ message: "Error updating post", error: error.message });
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
      text,
      createdAt: new Date()
    });

    await post.save();

    res.json({ message: "Comment added" });
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

// GET /api/posts/user/:userId
router.get("/user/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const posts = await Post.aggregate([
      { $match: { userId } },
      { $sort: { createdAt: -1 } },

      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "userId",
          as: "userInfo"
        }
      },
      { $unwind: "$userInfo" },

      {
        $project: {
          _id: 1,
          content: 1,
          images: 1,
          likes: 1,
          createdAt: 1,
          updatedAt: 1,
          comments: 1,
          userId: 1,
          username: "$userInfo.username",
          profilePicture: "$userInfo.profilePicture"
        }
      }
    ]);

    res.json({ posts });
  } catch (error) {
    res.status(500).json({ message: "Error fetching user posts", error: error.message });
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