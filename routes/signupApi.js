import express from "express";
import User from "../models/User.js";

const router = express.Router();

// ✅ POST /api/signup — Register a new user
router.post("/signup", async (req, res) => {
  const { username, email, password } = req.body;

  // ✅ Input validation
  if (!username || !email || !password) {
    return res.status(400).json({ message: "All fields are required." });
  }

  try {
    // ✅ Check if the user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(409).json({ message: "User already exists." });
    }

    // ✅ Create and save new user
    const newUser = new User({ username, email, password });
    await newUser.save();

    res.status(201).json({
      message: "User registered successfully.",
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
      },
    });

  } catch (err) {
    // 🛑 Log full error and request payload for debugging
    console.error("🔥 Signup Error:", err);
    console.error("📨 Payload received:", req.body);

    res.status(500).json({ message: err.message || "Server error." });
  }
});

// ✅ GET /api/users — View all users (excluding passwords)
router.get("/users", async (req, res) => {
  try {
    const users = await User.find({}, { password: 0 }); // hide password
    res.json(users);
  } catch (err) {
    console.error("Fetch users error:", err);
    res.status(500).json({ message: "Server error." });
  }
});

export default router;
