import  express, { Router }  from "express";
import { deleteHandler, getHandler } from "../controllers/ChatHandler";
import authenticateToken from "../middlewares/Authmiddleware";
const chatRouter = Router()

chatRouter.get("/:title", authenticateToken, getHandler);
// chatRouter.post("/:title", authenticateToken, sendHandler);
chatRouter.delete("/delete/:title", authenticateToken, deleteHandler);

export {chatRouter}