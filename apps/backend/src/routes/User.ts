import  express, { Router }  from "express";
import { getUserHandler ,patchHandler , getBoardHandler } from "../controllers/Userhandler";
const userRouter = Router()

userRouter.get("/:id",getUserHandler);
userRouter.get("/:id/boards",getBoardHandler);
userRouter.patch("/:id",patchHandler)

export {userRouter}