import { Router } from "express";
import { meHandler, signinHandler, signupHandler } from "../controllers/AuthHandler";
import authenticateToken from "../middlewares/Authmiddleware";
import { rateLimit } from "../middlewares/rateLimit";

const authRouter = Router();
const authLimiter = rateLimit({ windowMs: 60_000, max: 20 });

authRouter.post("/signup", authLimiter, signupHandler);
authRouter.post("/signin", authLimiter, signinHandler);
authRouter.get("/me", authenticateToken, meHandler);

export { authRouter };
