import { NextFunction, Response } from "express";
import mongoose, { ClientSession } from "mongoose";
import { AuthRequest } from "./authMiddleware";

export interface DbSessionRequest extends AuthRequest{
    dbSession?: ClientSession
}

export const sessionMiddleware = async (req:DbSessionRequest,res:Response,next:NextFunction)=>{ 
    const session = await mongoose.startSession();
    req.dbSession = session
    let transactionEnded:boolean =false
    try{
        session.startTransaction()
        res.on('finish',async()=>{
            if(!transactionEnded && res.statusCode>=200 && res.statusCode<300){
                await session.commitTransaction();
            }else{
                await session.abortTransaction()
            }
            await session.endSession()
        })
        next()
    }catch(error:any){
        if (!transactionEnded) {
            await session.abortTransaction();
            transactionEnded = true;
        }
        return next(error); 
    }
}