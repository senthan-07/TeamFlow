import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import { Request , Response } from "express";
dotenv.config();

const prisma = new PrismaClient();


//Fetch history ig
const getDrawingHandler = async(req:Request,res:Response)=>{
    const { title } = req.params;
    if(!title){
        res.status(400).json("Board Title is requires");
        return;
    }
    const board = await prisma.board.findUnique({where:{title}});
    if(!board){
        res.status(404).json("Board is not found");
        return;
    }
    const drawing = await prisma.drawing.findFirst({
        where: { boardId: board.id },
        orderBy: { updatedAt: "desc" },
    });

    res.json(drawing || { data: null });
}

//Save history  
const saveDrawingHandler = async(req:Request,res:Response)=>{
    const { title } = req.params;
    const { data } = req.body;    
    if(!title){
        res.status(400).json("Board Title is requires");
        return;
    }
    if(!data){
        res.status(400).json("data is requires");
        return;
    }
    const board = await prisma.board.findUnique({ where: { title } });
    if(!board){
        res.status(404).json("Board is not found");
        return;
    }
    //upset is basically if exists? update : create
    const drawing = await prisma.drawing.upsert({
        where: { boardId: board.id },
        update: { data },
        create: {
        boardId: board.id,
        data,
        },
    });
    res.json(drawing)
}

const deleteHandler = async(req:Request,res:Response)=>{
    const { title } = req.params;
    if(!title){
        res.status(400).json("Board Title is requires");
        return;
    }
    const board = await prisma.board.findUnique({where:{title}});
    if(!board){
        res.status(404).json("Board is not found");
        return;
    }
    const drawing = await prisma.drawing.findUnique({ where: { boardId: board.id } });
    if (!drawing) {
        res.status(404).json("Drawing not found for this board");
        return;
    }
    await prisma.drawing.delete({ where: { id: drawing.id } });
    res.json({ message: "Drawing deleted successfully" });
};

export {getDrawingHandler,saveDrawingHandler,deleteHandler}