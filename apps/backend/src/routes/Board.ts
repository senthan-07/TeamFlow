import  express, { Router }  from "express";
import { BoardUserHandler, DeletHandler, getBoardHandler, InviteHandler, newBoardHandler, updateHandler } from "../controllers/BoardHandler";
import authenticateToken from "../middlewares/Authmiddleware";
const boardRouter = Router()

boardRouter.get("/details",authenticateToken,getBoardHandler);
boardRouter.post("/new",authenticateToken,newBoardHandler);
boardRouter.get("/users",authenticateToken,BoardUserHandler);
boardRouter.post("/invite",authenticateToken,InviteHandler);
boardRouter.patch("/update",authenticateToken,updateHandler);
boardRouter.delete("/delete",authenticateToken,DeletHandler);

export {boardRouter}