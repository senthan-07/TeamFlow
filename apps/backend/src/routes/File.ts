import  express, { Router }  from "express";
import { deleteHandler, getHandler, sendHandler } from "../controllers/FileHandler";
import authenticateToken from "../middlewares/Authmiddleware";
import { upload } from "../middlewares/multer";
const fileRouter = Router()

fileRouter.get("/:title",authenticateToken,getHandler);
fileRouter.post("/",upload.single("file"),authenticateToken,sendHandler);
fileRouter.delete("/:title/:id",authenticateToken,deleteHandler);

export {fileRouter}