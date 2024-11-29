import jwt from "jsonwebtoken";
import { Request, RequestHandler, Response } from "express";


import { UserModel } from "../models/userModel";
import { IJwtPayload } from "../types/jwtPayloadTypes";
import { IObjectId } from "../types/modalTypes";


// Generate JWT function
export const jwtGenerator = (userId:IObjectId,passwordChangedAt:string,cartId?:IObjectId,role:string="user"):string=>{
  
  let payload:IJwtPayload

  if(role==="user"){
    if(!cartId){
      throw new Error("cartId is required for the user role");
    }
    payload = { userId, passwordChangedAt, cartId};
  }else{
    payload = { userId, passwordChangedAt, role};
  }
  const expiresIn = role==="admin"?"1d":"12h"
  return jwt.sign(payload, process.env.JWT_SECRET as string, {expiresIn});

}


// Verify email route 
export const verifyEmailAuth:RequestHandler = async (req: Request, res: Response) => {
  const { token } = req.params;
  
  try {
    // verify the JWT token
    const decoded = jwt.verify(token, process.env.JWT_VERIFICATION_SECRET!) as { email: string };

    // check if the user is exists 
    const user = await UserModel.findOne({ email: decoded.email });
    if (!user) {
      return res.render('verificationResult', {
        type: 'Verification Failed',
        message: 'User not found',
        redirectLink: "https://mail.google.com/",
        description: "There was a problem processing your request! Please try again later!"
      });
    }

    // check if he is verified 
    if (user.isVerified) {
      return res.render('verificationResult', {
        type: 'Verification Failed',
        message: 'Email already verified',
        redirectLink: "https://mail.google.com/",
        description: "You're all set! Your account is already verified!"
      });
    }

    // mark as verified and update it 
    user.isVerified = true;
    user.verificationTokenExpiresAt = undefined;
    await user.save();

    
    return res.render('verificationResult', {
      type: 'success',
      message: 'Email verified successfully',
      redirectLink: "https://mail.google.com/",
      description: "Your account was verified successfully!"
    });

  } catch (error) {
    // malformed token
    if (error instanceof jwt.JsonWebTokenError) {
    
      return res.render('verificationResult', {
        type: 'error',
        message: 'Invalid token',
        redirectLink: "https://mail.google.com/",
        description: "The verification link is invalid. Please request a new one."
      });
    } else if (error instanceof jwt.TokenExpiredError) { // Expired token
      return res.render('verificationResult', {
        type: 'error',
        message: 'Token expired',
        redirectLink: "https://mail.google.com/",
        description: "The verification link has expired. Please request a new one."
      });
    } else {
      
      console.error("Email Verification Token error\n"+error);
      return res.render('verificationResult', {
        type: 'error',
        message: 'Server Error',
        redirectLink: "https://mail.google.com/",
        description: "An unexpected error occurred. Please try again later."
      });
    }
  }
};
