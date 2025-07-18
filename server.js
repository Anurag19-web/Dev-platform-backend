import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import connectDB from "./config/dataBase.js";
import blogsApi from "./routes/BlogsApi.js";
import signupApi from "./routes/signupApi.js";

const app = express();
const PORT = process.env.PORT || 5000;

// CORS: allow both local dev and deployed frontend
app.use(cors({
  origin: [
    "http://localhost:5173", // your local React frontend
    "https://dev-platform-frontend-qtfu.vercel.app" // deployed frontend
  ],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

connectDB();

app.use("/api", signupApi);
app.use("/", blogsApi);

app.get("/", (req, res) => res.json({ message: "API is running" }));

app.listen(PORT, () => console.log(`🚀 Server running at port ${PORT}`));
