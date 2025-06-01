import  express, { Router }  from "express";
import { deleteHandler, getHandler, sendHandler } from "../controllers/FileHandler";
import authenticateToken from "../middlewares/Authmiddleware";
import { upload } from "../middlewares/multer";
const fileRouter = Router()

fileRouter.get("/:id",authenticateToken,getHandler);
fileRouter.post("/:id",authenticateToken,upload.single("file"),sendHandler);
fileRouter.delete("/:boardId/:fileId",authenticateToken,deleteHandler);

export {fileRouter}