import { Router } from "express";
import {
  deleteHandler,
  getAllBoardHandler,
  getBoardHandler,
  getMembersHandler,
  inviteHandler,
  newBoardHandler,
  removeMemberHandler,
  updateHandler,
} from "../controllers/BoardHandler";
import authenticateToken from "../middlewares/Authmiddleware";

const boardRouter = Router();
boardRouter.use(authenticateToken);

// Static paths must come before "/:id" or they'd be swallowed by it.
boardRouter.get("/all", getAllBoardHandler);
boardRouter.post("/new", newBoardHandler);

boardRouter.get("/:id", getBoardHandler);
boardRouter.patch("/:id", updateHandler);
boardRouter.delete("/:id", deleteHandler);

boardRouter.get("/:id/members", getMembersHandler);
boardRouter.post("/:id/members", inviteHandler);
boardRouter.delete("/:id/members/:userId", removeMemberHandler);

export { boardRouter };
