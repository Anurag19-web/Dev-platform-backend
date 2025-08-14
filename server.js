import dotenv from "dotenv";
dotenv.config(); // ✅ Load environment variables

import express from "express";
import cors from "cors";
import connectDB from "./config/dataBase.js";
import blogsApi from "./routes/BlogsApi.js";
import signupApi from "./routes/signupApi.js";
import loginApi from "./routes/loginApi.js";
import userRoutes from "./routes/users.js";
import postsRoutes from "./routes/posts.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import savePostRoutes from "./routes/savePost.js";

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ CORS configuration
const allowedOrigins = [
  "http://localhost:5173", // Local dev frontend
  "https://dev-platform-frontend-qtfu.vercel.app" // Vercel deployed frontend
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("CORS not allowed"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept"],
  credentials: true,
};

// ✅ Apply CORS middleware
app.use(cors(corsOptions));

// ✅ Handle all OPTIONS requests manually (important!)
app.options("*", (req, res) => {
  res.set({
    "Access-Control-Allow-Origin": req.headers.origin || "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept",
    "Access-Control-Allow-Credentials": "true",
  });
  return res.sendStatus(200);
});

// ✅ Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Connect to MongoDB Atlas
connectDB();

// ✅ Routes
app.use("/api", signupApi);       // Handles /api/signup
app.use("/api", loginApi);        // Handles /api/login
app.use("/", blogsApi);           // Handles blog-related routes
app.use("/api", userRoutes);      // Handles user profile routes
app.use("/api/posts", postsRoutes);
app.use("/api", uploadRoutes);
app.use("/api/save", savePostRoutes);

// ✅ Serve static profile images
app.use("/uploads", express.static("uploads"));

// ✅ Health Check Route
app.get("/", (req, res) => {
  res.json({ message: "API is running successfully 🚀" });
});

// ✅ Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running at port ${PORT}`);
});