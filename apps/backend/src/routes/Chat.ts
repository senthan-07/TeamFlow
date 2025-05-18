import  express, { Router }  from "express";
import { deleteHandler, getHandler, sendHandler } from "../controllers/ChatHandler";
const chatRouter = Router()

chatRouter.get("/:id",getHandler);
chatRouter.post("/:id",sendHandler);
chatRouter.delete("/delete/:id",deleteHandler);

export {chatRouter}