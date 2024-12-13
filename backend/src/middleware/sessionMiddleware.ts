import { NextFunction, Request, Response } from "express";
import mongoose, { ClientSession } from "mongoose";
import { AuthRequest } from "./authMiddleware";

export interface DbSessionRequest extends AuthRequest{
    dbSession: ClientSession
}

export const sessionMiddleware = async (req:DbSessionRequest,res:Response,next:NextFunction)=>{ 
    const session = await mongoose.startSession();
    req.dbSession = session
    try{
        session.startTransaction()
        res.on('finish',async()=>{
            if(res.statusCode>=200 && res.statusCode<300){
                await session.commitTransaction();
            }else{
                await session.abortTransaction()
            }
        })
        next()
    }catch(error){
        res.status(500).json({message:"Server Error"})
        await session.abortTransaction();
    } finally{
        session.endSession()
    }
}