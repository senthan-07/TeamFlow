import express from "express";
import { PrismaClient } from "@prisma/client";
import cors from "cors";
import { authRouter } from "./routes/Auth";
import { userRouter } from "./routes/User";
import { boardRouter } from "./routes/Board";
import { drawRouter } from "./routes/Draw";
import { chatRouter } from "./routes/Chat";
import { fileRouter } from "./routes/File";

const app = express();
const prisma = new PrismaClient();
app.use(cors());
app.use(express.json());

app.use("/auth",authRouter)
app.use("/user",userRouter)
app.use("/board",boardRouter)
app.use("/draw",drawRouter)
app.use("/chat",chatRouter)
app.use("/files",fileRouter)


app.listen(4000, () => {
  console.log("Server running on http://localhost:4000");
});
