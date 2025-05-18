import  express, { Router }  from "express";
import { deleteHandler, getDrawingHandler, saveDrawingHandler } from "../controllers/DrawHandler";
const drawRouter = Router()

drawRouter.get("/:id",getDrawingHandler);
drawRouter.post("/save",saveDrawingHandler);
drawRouter.delete("/delete/:id",deleteHandler);

export {drawRouter}