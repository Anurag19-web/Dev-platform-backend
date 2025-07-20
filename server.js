// server.js

import dotenv from "dotenv";
dotenv.config(); // ✅ Load environment variables

import express from "express";
import cors from "cors";
import connectDB from "./config/dataBase.js";
import blogsApi from "./routes/BlogsApi.js";
import signupApi from "./routes/signupApi.js";
import loginApi from "./routes/loginApi.js";
import userRoutes from "./routes/users.js";

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ CORS configuration
const allowedOrigins = [
  "http://localhost:5173", // Local dev frontend
  "https://dev-platform-frontend-qtfu.vercel.app" // Vercel deployed frontend
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("CORS not allowed"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept"],
  credentials: true,
}));

// ✅ Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Connect to MongoDB Atlas
connectDB();

// ✅ Routes
app.use("/api", signupApi); // Handles /api/signup etc.
app.use("/api",loginApi)
app.use("/", blogsApi);     // Handles blog-related routes
app.use("/api", userRoutes); // ✅ Add this below login route
// Serve static files
app.use("/uploads", express.static("uploads")); // 3️⃣ Serve profile images

// ✅ Health Check Route
app.get("/", (req, res) => {
  res.json({ message: "API is running successfully 🚀" });
});

// ✅ Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running at port ${PORT}`);
});
