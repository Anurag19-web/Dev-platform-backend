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
      userId: user.userId,
      username: user.username,
    });
  } catch (err) {
    console.error("Login Error:", err.message);
    res.status(500).json({ message: "❌ Server error" });
  }
});

// ================= Update Password =================
router.put("/update-password", async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    // hash new password before saving
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await User.findOneAndUpdate(
      { email },
      { password: hashedPassword }
    );

    res.json({ success: true, message: "Password updated successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
