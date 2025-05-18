import  express, { Router }  from "express";
import { signinHandler , signupHandler } from "../controllers/AuthHandler";
const authRouter = Router()

authRouter.post("/signup",signupHandler);
authRouter.post("/signin",signinHandler);

export {authRouter}