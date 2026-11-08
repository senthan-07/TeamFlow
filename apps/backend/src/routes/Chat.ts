import { Router } from "express";
import { deleteHandler, getHandler } from "../controllers/ChatHandler";
import authenticateToken from "../middlewares/Authmiddleware";

const chatRouter = Router();
chatRouter.use(authenticateToken);

chatRouter.get("/:boardId", getHandler);
chatRouter.delete("/:boardId", deleteHandler);

export { chatRouter };
