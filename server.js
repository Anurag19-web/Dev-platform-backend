// server.js

import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import connectDB from "./config/dataBase.js";
import blogsApi from "./routes/BlogsApi.js";
import signupApi from "./routes/signupApi.js";

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ CORS configuration — handles both frontend origins & preflight
const allowedOrigins = [
  "http://localhost:5173",
  "https://dev-platform-frontend-qtfu.vercel.app"
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
  allowedHeaders: ["Content-Type"],
  credentials: true
}));

// ✅ Handle preflight (OPTIONS) requests
app.options("*", cors());

// ✅ Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ DB Connection
connectDB();

// ✅ Routes
app.use("/api", signupApi);
app.use("/", blogsApi);

// ✅ Health Check
app.get("/", (req, res) => res.json({ message: "API is running" }));

// ✅ Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running at port ${PORT}`);
});
