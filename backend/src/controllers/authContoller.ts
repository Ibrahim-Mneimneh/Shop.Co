import jwt from "jsonwebtoken"
import { Request,Response } from "express";
import { UserModel } from "models/userModel";

export const verifyEmailAuth = async (req:Request,res:Response)=>{
    const { token } = req.params;
    try{
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { email: string };

    const user = await UserModel.findOne({ email: decoded.email });
    if (!user) {
        res.status(400).json({ message: 'User not found' });
        return
    }

    // Check if already verified
    if (user.isVerified) {
        res.status(400).json({ message: 'Email already verified' });
        return
    }

    // Mark user as verified
    user.isVerified = true;
    await user.save();

    res.status(200).json({ message: 'Email verified successfully' });
    }catch(error){
        console.log(error)
        res.status(500).json({message:"Server Error"})
    }
}