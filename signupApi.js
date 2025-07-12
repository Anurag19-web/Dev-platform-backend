import express from "express";

const router = express.Router();

// In-memory user store (reset every restart)
let users = [];

// ✅ POST /api/signup — Register a new user
router.post("/signup", (req, res) => {
  const { username, email, password } = req.body;

  // Validate fields
  if (!username || !email || !password) {
    return res.status(400).json({ message: "All fields are required." });
  }

  // Check if user exists by email or username
  const userExists = users.find(
    (user) => user.email === email || user.username === username
  );

  if (userExists) {
    return res.status(409).json({ message: "User already exists." });
  }

  // Create and store new user
  const newUser = { id: users.length + 1, username, email, password };
  users.push(newUser);

  // Respond with success
  res.status(201).json({
    message: "User registered successfully.",
    user: { id: newUser.id, username, email },
  });
});

// ✅ Optional: GET /api/users — View all registered users (for testing)
router.get("/users", (req, res) => {
  res.json(users.map(({ password, ...rest }) => rest)); // hide password
});

export default router;