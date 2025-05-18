import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
dotenv.config();

const prisma = new PrismaClient();


const getHandler = async(req,res)=>{

}

const sendHandler = async(req,res)=>{

}

const deleteHandler = async(req,res)=>{

}

export {getHandler,sendHandler,deleteHandler}