import { Router } from "express";
import { listSessionsHandler } from "../controllers/RTCHandler";
import authenticateToken from "../middlewares/Authmiddleware";

const RTCrouter = Router();

RTCrouter.get("/:boardId", authenticateToken, listSessionsHandler);

export default RTCrouter;
