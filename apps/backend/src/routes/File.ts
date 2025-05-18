import  express, { Router }  from "express";
import { deleteHandler, getHandler, sendHandler } from "../controllers/FileHandler";
const fileRouter = Router()

fileRouter.get("/:id",getHandler);
fileRouter.post("/:id",sendHandler);
fileRouter.delete("/delete/:id",deleteHandler);

export {fileRouter}