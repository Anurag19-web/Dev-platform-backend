// server.js
import express from "express";
import cors from "cors";
import connectDB from "./config/dataBase.js"; // MongoDB connection
import blogsApi from "./routes/BlogsApi.js";
import signupApi from "./routes/signupApi.js";

const app = express();
const PORT = 5000;

connectDB(); // Connect to MongoDB

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", signupApi);
app.use("/", blogsApi);

app.get("/", (req, res) => {
  res.json({ message: "API is running" });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
