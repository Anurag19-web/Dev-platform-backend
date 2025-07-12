import express from "express";
import cors from "cors";
import blogsApi from "./BlogsApi.js"
import signupApi from "./signupApi.js"; // Adjust path if needed

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json()); // for fetch, Postman
app.use(express.urlencoded({ extended: true })); // for HTML form

// Use the signup router at /api
app.use("/api", signupApi);
app.use("/",blogsApi)

app.get("/",(req,res)=>{
    res.json(express.json())
})

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});