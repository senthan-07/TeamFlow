import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import { Request , Response } from "express";
dotenv.config();

const prisma = new PrismaClient();


const getUserHandler = async(req : Request,res: Response)=>{
    try{
        const userId = req.userId;
        if(!userId) res.status(401).json({error:"Not signed in"});

        const user = await prisma.user.findUnique({
            where : {id : userId},
            select: {
                id: true,
                email: true,
                name:true,
                createdAt:true,
                updatedAt:true,
                files:true 
            },
        })
        if (!user) res.status(404).json({ error: "User not found" });
        res.json(user);
        return;
    }catch(err){
        console.log("getuserHandler error : ",err);
        res.status(500).json({ error: "Internal Server Error" });
        return;
    }
}

const getBoardHandler = async (req:Request, res:Response) => {
  try {
    const userId = req.userId;
    if (!userId) res.status(401).json({ error: "Unauthorized" });

    const boards = await prisma.board.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { users: { some: { id: userId } } }, 
        ],
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        users: { select: { id: true, name: true, email: true } },
      },
    });

    res.json(boards);
    return;
  } catch (err) {
    console.error("getBoardHandler error:", err);
    res.status(500).json({ error: "Internal Server Error" });
    return;
  }
};


const patchHandler = async (req:Request, res:Response) => {
  try {
    const userId = req.userId;
    if (!userId) res.status(401).json({ error: "Unauthorized" });

    const { name, password } = req.body;

    const data: any = {};
    if (name) data.name = name;
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      data.password = hashedPassword;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        updatedAt: true,
      },
    });

    res.json(updatedUser);
    return;
  } catch (err) {
    console.error("patchHandler error:", err);
    res.status(500).json({ error: "Internal Server Error" });
    return;
  }
};

export {getUserHandler,getBoardHandler,patchHandler}