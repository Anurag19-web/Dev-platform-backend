// routes/signup.js
import express from "express";
import bcrypt from "bcrypt";
import User from "../models/User.js";

const router = express.Router();

// ✅ POST /api/signup — Register a new user
router.post("/signup", async (req, res) => {
  const { username, email, password, userId } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: "All fields are required." });
  }

  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(409).json({ message: "User already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      userId,
      username,
      email,
      password: hashedPassword,
    });

    await newUser.save();

    res.status(201).json({
      message: "User registered successfully.",
      user: {
        userId: newUser.userId,
        username: newUser.username,
        email: newUser.email,
      },
    });
  } catch (err) {
    console.error("🔥 Signup Error:", err);
    console.error("📨 Payload received:", req.body);
    res.status(500).json({ message: err.message || "Server error." });
  }
});

// ✅ GET /api/users — View all users (excluding passwords)
router.get("/users", async (req, res) => {
  try {
    const users = await User.find({}, { password: 0 });
    res.json(users);
  } catch (err) {
    console.error("Fetch users error:", err);
    res.status(500).json({ message: "Server error." });
  }
});

// ✅ GET /api/users/:userId — Get user by random userId
router.get("/users/:userId", async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.params.userId }).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    res.status(200).json(user);
  } catch (err) {
    console.error("Fetch user by userId error:", err);
    res.status(500).json({ message: "Server error." });
  }
});

export default router;