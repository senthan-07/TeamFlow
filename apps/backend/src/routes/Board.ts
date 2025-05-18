import  express, { Router }  from "express";
import { BoardUserHandler, DeletHandler, getBoardHandler, InviteHandler, newBoardHandler, updateHandler } from "../controllers/BoardHandler";
const boardRouter = Router()

boardRouter.get("/:id",getBoardHandler);
boardRouter.post("/new",newBoardHandler);
boardRouter.get("/users/:id",BoardUserHandler);
boardRouter.post("/invite/:id",InviteHandler);
boardRouter.patch("/update/:id",updateHandler);
boardRouter.delete("/delete/:id",DeletHandler);

export {boardRouter}