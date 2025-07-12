import express from "express";
import cors from "cors";

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

let users = [];

// signup API
app.post("/api/signup", (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: "All fields are required." });
  }

  const userExists = users.find(
    (user) => user.email === email || user.username === username
  );
  if (userExists) {
    return res.status(409).json({ message: "User already exists." });
  }
  const newUser = { id: users.length + 1, username, email, password };
  users.push(newUser);

  res.status(201).json({
    message: "User registered successfully.",
    user: { id: newUser.id, username, email },
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});