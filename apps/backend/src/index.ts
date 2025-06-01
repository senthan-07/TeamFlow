import express from "express";
import { PrismaClient } from "@prisma/client";
import cors from "cors";
import { initChatSocket } from "./sockets/chat"; 
import { initDrawSocket } from "./sockets/draw";
import { initRTC } from "./sockets/rtc";
import { createServer } from "http";
import { Server } from "socket.io";

import { authRouter } from "./routes/Auth";
import { userRouter } from "./routes/User";
import { boardRouter } from "./routes/Board";
import { drawRouter } from "./routes/Draw";
import { chatRouter } from "./routes/Chat";
import { fileRouter } from "./routes/File";
import RTCrouter from "./routes/RTC";
import path from "path";
const uploadPath = ''

const app = express();
const prisma = new PrismaClient();
app.use(cors());
app.use(express.json());

const server = createServer(app); 
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use("/auth",authRouter)
app.use("/user",userRouter)
app.use("/board",boardRouter)
app.use("/draw",drawRouter)
app.use("/chat",chatRouter)
app.use("/files",fileRouter)
app.use("/rtc",RTCrouter)

console.log("Serving uploads from:", path.join(__dirname, '../uploads'));
console.log("Process cwd:", process.cwd());

app.get('/testfile', (req, res) => {
  res.sendFile(path.join(__dirname, '../uploads', '1748179502709-189706323.jpg'));
});


app.use('/uploads', express.static(path.join(__dirname, '../uploads')));


initChatSocket(io);
initDrawSocket(io);
initRTC(io);


server.listen(4000, () => {
  console.log("Server running on http://localhost:4000");
});
