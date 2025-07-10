import express from "express";
import cors from "cors";

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

const users = [
  {
    "id": "1",
    "username": "anuragNayak",
    "title": "Mastering React in 30 Days",
    "description": "A complete roadmap and key resources for learning React.js from scratch.",
    "comments": ["Great guide!", "Really helpful.", "Bookmarked!"],
    "likes": 45,
    "userProfilePicture": "https://randomuser.me/api/portraits/men/1.jpg"
  },
  {
    "id": "2",
    "username": "codeQueen",
    "title": "How to Deploy Your MERN App",
    "description": "Step-by-step tutorial to deploy MERN stack apps on Render and Vercel.",
    "comments": ["Thanks!", "Clear and simple.", "Loved this post!"],
    "likes": 37,
    "userProfilePicture": "https://randomuser.me/api/portraits/women/2.jpg"
  },
  {
    "id": "3",
    "username": "devManish",
    "title": "10 JavaScript Tricks Every Dev Should Know",
    "description": "This article lists handy tricks to improve your JavaScript skills.",
    "comments": ["Super useful!", "JS magic!", "Thanks for sharing."],
    "likes": 88,
    "userProfilePicture": "https://randomuser.me/api/portraits/men/3.jpg"
  },
  {
    "id": "4",
    "username": "frontendFan",
    "title": "Tailwind CSS vs Bootstrap",
    "description": "A deep comparison between Tailwind CSS and Bootstrap for modern UI development.",
    "comments": ["Tailwind FTW!", "I prefer Bootstrap though.", "Good analysis."],
    "likes": 62,
    "userProfilePicture": "https://randomuser.me/api/portraits/women/4.jpg"
  },
  {
    "id": "5",
    "username": "nodeNerd",
    "title": "Understanding Express Middleware",
    "description": "Learn how middleware works in Express.js with real-world examples.",
    "comments": ["Now I understand!", "Nice explanation.", "Saved!"],
    "likes": 50,
    "userProfilePicture": "https://randomuser.me/api/portraits/men/5.jpg"
  },
  {
    "id": "6",
    "username": "bcaStudent",
    "title": "My Journey Learning MERN Stack",
    "description": "Sharing my daily progress and challenges while learning full stack development.",
    "comments": ["Inspiring!", "Keep going!", "Relatable content."],
    "likes": 29,
    "userProfilePicture": "https://randomuser.me/api/portraits/men/6.jpg"
  },
  {
    "id": "7",
    "username": "techieRiya",
    "title": "5 VSCode Extensions for React Devs",
    "description": "Boost your productivity with these awesome VSCode extensions.",
    "comments": ["Got them all!", "Never heard of #3!", "Thanks a ton!"],
    "likes": 74,
    "userProfilePicture": "https://randomuser.me/api/portraits/women/7.jpg"
  },
  {
    "id": "8",
    "username": "aiCoder",
    "title": "What is Socket.IO and How to Use It",
    "description": "Real-time communication simplified with Socket.IO.",
    "comments": ["Exactly what I needed!", "Awesome!", "Very clear tutorial."],
    "likes": 66,
    "userProfilePicture": "https://randomuser.me/api/portraits/men/8.jpg"
  },
  {
    "id": "9",
    "username": "openSourceDev",
    "title": "Why You Should Contribute to Open Source",
    "description": "The benefits of open-source contribution for your career and skills.",
    "comments": ["Totally agree.", "Started contributing!", "Useful tips."],
    "likes": 53,
    "userProfilePicture": "https://randomuser.me/api/portraits/women/9.jpg"
  },
  {
    "id": "10",
    "username": "cloudGuru",
    "title": "Hosting MongoDB in the Cloud",
    "description": "Best platforms and practices for hosting your MongoDB databases online.",
    "comments": ["Good list of services.", "Try MongoDB Atlas!", "Thanks for this."],
    "likes": 41,
    "userProfilePicture": "https://randomuser.me/api/portraits/men/10.jpg"
  }
]

console.log(users);

app.get("/blogs/users", (req,res) =>{
    res.json(users);
})

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
