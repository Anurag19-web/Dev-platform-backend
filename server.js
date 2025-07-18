import dotenv from "dotenv";
dotenv.config();

// server.js
import express from "express";
import cors from "cors";
import connectDB from "./config/dataBase.js";
import blogsApi from "./routes/BlogsApi.js";
import signupApi from "./routes/signupApi.js";

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ CORS configuration — allow both local and deployed frontend
app.use(cors({
  origin: [
    "http://localhost:5173",                     // local dev
    "https://dev-platform-frontend-qtfu.vercel.app" // deployed frontend
  ],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

// ✅ Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Connect to MongoDB
connectDB();

// ✅ Routes
app.use("/api", signupApi);
app.use("/", blogsApi);

// ✅ Health check route
app.get("/", (req, res) => {
  res.json({ message: "API is running" });
});

// ✅ Start the server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
