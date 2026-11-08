import { Router } from "express";
import { deleteHandler, getHandler, sendHandler } from "../controllers/FileHandler";
import authenticateToken from "../middlewares/Authmiddleware";
import { upload } from "../middlewares/multer";

const fileRouter = Router();
fileRouter.use(authenticateToken);

fileRouter.get("/:boardId", getHandler);
fileRouter.post("/:boardId", upload.single("file"), sendHandler);
fileRouter.delete("/:boardId/:fileId", deleteHandler);

export { fileRouter };
