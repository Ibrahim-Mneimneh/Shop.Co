import { Request, RequestHandler, Response } from "express";
import jwt from "jsonwebtoken"
import { UserModel } from "../models/userModel";

export interface IJwtPayload {
  userId: string;
  passwordChangedAt: string;
  cartId: string;
}


export const authMiddleware = async (req:Request,res:Response,next:Function)=>{
try{
    const { authorization } = req.headers;

    if (!authorization || authorization.startsWith('Bearer ')) {
        res.status(401).json({ message: "Authorization token required!" });
        return
    }
    const token = authorization.split(" ")[1];

    const { userId, passwordChangedAt, cartId } = jwt.verify(token, process.env.JWT_SECRET as string) as IJwtPayload

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
    if(user.passwordChangedAt.toISOString()>passwordChangedAt){
        res.status(401).json({message:"UnAuthorized Access - User token expired"})
        return
    }

    //req.userId=user._id
    //req.cartId=cartId

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