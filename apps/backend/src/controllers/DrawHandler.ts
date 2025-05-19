import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import { Request , Response } from "express";
dotenv.config();

const prisma = new PrismaClient();


const getDrawingHandler = async(req:Request,res:Response)=>{

}

const saveDrawingHandler = async(req:Request,res:Response)=>{

}

const deleteHandler = async(req:Request,res:Response)=>{

}

export {getDrawingHandler,saveDrawingHandler,deleteHandler}