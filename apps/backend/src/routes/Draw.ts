import { Router } from "express";
import { deleteHandler, getDrawingHandler } from "../controllers/DrawHandler";
import authenticateToken from "../middlewares/Authmiddleware";

const drawRouter = Router();
drawRouter.use(authenticateToken);

drawRouter.get("/:boardId", getDrawingHandler);
drawRouter.delete("/:boardId", deleteHandler);

export { drawRouter };
