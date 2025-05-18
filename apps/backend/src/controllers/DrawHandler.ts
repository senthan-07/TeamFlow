import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
dotenv.config();

const prisma = new PrismaClient();


const getDrawingHandler = async(req,res)=>{

}

const saveDrawingHandler = async(req,res)=>{

}

const deleteHandler = async(req,res)=>{

}

export {getDrawingHandler,saveDrawingHandler,deleteHandler}