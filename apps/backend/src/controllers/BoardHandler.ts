import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import { Request , Response } from "express";
dotenv.config();

const prisma = new PrismaClient();


const newBoardHandler = async(req:Request,res:Response)=>{

}

const getBoardHandler = async(req:Request,res:Response)=>{

}

const BoardUserHandler = async(req:Request,res:Response)=>{

}

const InviteHandler = async(req:Request,res:Response)=>{

}

const updateHandler = async(req:Request,res:Response)=>{

}

const DeletHandler = async(re:Request,res:Response)=>{

}

export {newBoardHandler,getBoardHandler,BoardUserHandler,InviteHandler,updateHandler,DeletHandler}