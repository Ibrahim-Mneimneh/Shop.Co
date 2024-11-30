import { Request, Response } from "express";
import jwt from "jsonwebtoken"
import { UserModel } from "../models/userModel";

import { IAdminJwtPayload, IJwtPayload, isAdminPayload, IUserJwtPayload } from "../types/jwtPayloadTypes";
import { IObjectId } from "../types/modalTypes";



export interface AuthRequest extends Request{
    userId?: IObjectId;
    cartId?: IObjectId;
    role?:string
}

export const authMiddleware = async (req:AuthRequest,res:Response,next:Function)=>{
try{
    const { authorization } = req.headers;

    if (!authorization || !authorization.startsWith('Bearer ')) {
        res.status(401).json({ message: "Authorization token required!" });
        return
    }
    const token = authorization.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as IJwtPayload

    const isAdminsPayload= isAdminPayload(decoded)

    // If the user is 
    if(isAdminsPayload && decoded.role==="admin"){
        const {userId,passwordChangedAt,role}=decoded as IAdminJwtPayload
        const user = await UserModel.findById(userId);
        //user exists
        if (!user) {
            res.status(404).json({ message: "UnAuthorized Access - User not found" });
            return
        }
        // check if the pass is changed prev tokens are rejected
        if(user.passwordChangedAt && user.passwordChangedAt.toISOString()>passwordChangedAt){
            res.status(401).json({message:"UnAuthorized Access - User token expired"})
            return
        }
        req.role=role as string
        req.userId=userId as IObjectId
    }else{
        const {userId,passwordChangedAt,cartId}:IUserJwtPayload=decoded as IUserJwtPayload
        const user = await UserModel.findById(userId);
        //user exists
        if (!user) {
            res.status(404).json({ message: "UnAuthorized Access - User not found" });
            return
        }

        // if user is not verified 
        if(!user.isVerified){
            res.status(401).json({message:"UnAuthorized Access - User not verified"}) 
            return
            // Send a verification code or not accorrding to the mechanism

        }

        // check if the pass is changed prev tokens are rejected
        if(user.passwordChangedAt && user.passwordChangedAt.toISOString()>passwordChangedAt){
            res.status(401).json({message:"UnAuthorized Access - User token expired"})
            return
        }
        // verify Token cartId matches user's cartId
        if(cartId.toString()!==user.cart.toString()){
            res.status(401).json({message:"UnAuthorized Access"})
            return
        }
        req.cartId=cartId as IObjectId
        req.userId=userId as IObjectId
    }
    
    next();

    }catch(error:any){
        if (error instanceof jwt.JsonWebTokenError) {
            console.error("Invalid token:", error.message);
            res.status(401).json({message:"Unauthorized Access"})
            } else if (error instanceof jwt.TokenExpiredError) {
                console.error("Token has expired:", error.message);
                res.status(401).json({message:"Unauthorized Access"})
                } else {
                    console.error("JWT verification failed:", error.message);
                    res.status(401).json({message:"Unauthorized Access"})
                }
    res.status(500).json({message:"Server Error"})
}
}