import  express, { Router }  from "express";
import { BoardUserHandler, DeletHandler, getAllBoardHandler, getBoardHandler, InviteHandler, newBoardHandler, updateHandler } from "../controllers/BoardHandler";
import authenticateToken from "../middlewares/Authmiddleware";
const boardRouter = Router()

boardRouter.get("/all",authenticateToken,getAllBoardHandler);
boardRouter.get("/details/:title",authenticateToken,getBoardHandler);
boardRouter.post("/new",authenticateToken,newBoardHandler);
boardRouter.get("/users",authenticateToken,BoardUserHandler);
boardRouter.post("/invite",authenticateToken,InviteHandler);
boardRouter.patch("/update",authenticateToken,updateHandler);
boardRouter.delete("/:title",authenticateToken,DeletHandler);

export {boardRouter}