import  express, { Router }  from "express";
import { getUserHandler ,patchHandler , getBoardHandler } from "../controllers/Userhandler";
import authenticateToken from "../middlewares/Authmiddleware";
const userRouter = Router()

userRouter.get("/:id",authenticateToken,getUserHandler);
userRouter.get("/:id/boards",authenticateToken,getBoardHandler);
userRouter.patch("/:id",authenticateToken,patchHandler)

export {userRouter}