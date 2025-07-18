// signupApi.js
import express from "express";
import User from "../models/User.js"; // ✅ Make sure the path is correct

const router = express.Router();

// ✅ POST /api/signup
router.post("/signup", async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: "All fields are required." });
  }

  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(409).json({ message: "User already exists." });
    }

    const newUser = new User({ username, email, password });
    await newUser.save();

    res.status(201).json({
      message: "User registered successfully.",
      user: { id: newUser._id, username, email },
    });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ message: "Server error." });
  }
});

// ✅ GET /api/users
router.get("/users", async (req, res) => {
  try {
    const users = await User.find({}, { password: 0 }); // exclude passwords
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Server error." });
  }
});

export default router;
