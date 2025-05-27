import { Router } from "express";
import {startSessionHandler,endSessionHandler,listSessionsHandler,} from "../controllers/RTCHandler";
import authenticateToken from "../middlewares/Authmiddleware";

const RTCrouter = Router();

RTCrouter.post("/start",authenticateToken,startSessionHandler);
RTCrouter.post("/end/:sessionId",authenticateToken,endSessionHandler);
RTCrouter.get("/:boardId",authenticateToken,listSessionsHandler);

export default RTCrouter;
