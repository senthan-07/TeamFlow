import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
dotenv.config();

const prisma = new PrismaClient();


const getUserHandler = async(req,res)=>{

}

const getBoardHandler = async(req,res)=>{

}

const patchHandler = async(req,res)=>{

}

export {getUserHandler,getBoardHandler,patchHandler}