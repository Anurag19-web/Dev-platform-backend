import express from "express";
import bcrypt from "bcrypt";
import User from "../models/User.js"; // Your MongoDB model

const router = express.Router();

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1. Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "❌ User not found" });
    }

    // 2. Compare passwords
    const isMatch = await bcrypt.compare(password, user.password); // assumes password is hashed
    if (!isMatch) {
      return res.status(401).json({ message: "❌ Invalid password" });
    }

    // 3. Success
    res.status(200).json({
      message: "✅ Login successful",
      id: user.id,
      username: user.username,
    });
  } catch (err) {
    console.error("Login Error:", err.message);
    res.status(500).json({ message: "❌ Server error" });
  }
});

export default router;
