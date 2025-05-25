import  express, { Router }  from "express";
import { deleteHandler, getHandler, sendHandler } from "../controllers/FileHandler";
import authenticateToken from "../middlewares/Authmiddleware";
const fileRouter = Router()

fileRouter.get("/:id",authenticateToken,getHandler);
fileRouter.post("/:id",authenticateToken,sendHandler);
fileRouter.delete("/delete/:id",authenticateToken,deleteHandler);

export {fileRouter}