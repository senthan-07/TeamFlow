import { Router } from "express";
import { getMeHandler, patchMeHandler } from "../controllers/Userhandler";
import authenticateToken from "../middlewares/Authmiddleware";

const userRouter = Router();
userRouter.use(authenticateToken);

userRouter.get("/me", getMeHandler);
userRouter.patch("/me", patchMeHandler);

export { userRouter };
