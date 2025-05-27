import  express, { Router }  from "express";
import { deleteHandler, getDrawingHandler, saveDrawingHandler } from "../controllers/DrawHandler";
import authenticateToken from "../middlewares/Authmiddleware";
const drawRouter = Router()

drawRouter.get("/:title",authenticateToken,getDrawingHandler);
drawRouter.post("/save/:title",authenticateToken,saveDrawingHandler);
drawRouter.delete("/delete/:title",authenticateToken,deleteHandler);

export {drawRouter}